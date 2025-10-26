'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Chip,
  Divider,
  ListItemButton,
  TextField,
  InputAdornment
} from '@mui/material';
import { ShoppingCart, TrendingUp, LocalGroceryStore, Search } from '@mui/icons-material';
import DateRangeFilter from '../../../components/DateRangeFilter';

interface Transaction {
  date: string;
  quantity: number;
  price: number;
  transactionId: string;
  discountValue: number;
  personalOfferId: string;
  voucherValue: number;
}

interface GroceryItem {
  description: string;
  totalQuantity: number;
  totalPrice: number;
  averagePrice: number;
  purchaseCount: number;
  totalDiscount: number;
  totalSavings: number;
  transactions: Transaction[];
}

export default function GroceryAnalysisPage() {
  const router = useRouter();
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [allItems, setAllItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ startDate: Date | null; endDate: Date | null }>({
    startDate: null,
    endDate: null
  });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    analyzeGroceryData();
  }, []);

  // Update filtered items when date range changes (only when not searching)
  useEffect(() => {
    if (!searchQuery.trim()) {
      let filtered = filterDataByDateRange(allItems);
      filtered = filtered
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 50);
      setItems(filtered);
    }
  }, [dateRange, allItems, searchQuery]);

  // Search through all XML files when search query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      searchItems(searchQuery);
    } else {
      // Reset to normal filtered view when search is cleared
      let filtered = filterDataByDateRange(allItems);
      filtered = filtered
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 50);
      setItems(filtered);
    }
  }, [searchQuery]);

  // Search through all XML files for items matching the query
  const searchItems = async (query: string) => {
    try {
      setSearchLoading(true);
      
      // Fetch both receipt XML files to get transaction dates
      const receiptFiles = ['/Butik_kvitto.xml', '/Butik_kvitto_2.xml'];
      const transactionDateMap = new Map<string, string>();

      for (const receiptFile of receiptFiles) {
        try {
          const receiptResponse = await fetch(receiptFile);
          if (!receiptResponse.ok) continue;
          const receiptXmlText = await receiptResponse.text();
          const receiptParser = new DOMParser();
          const receiptXmlDoc = receiptParser.parseFromString(receiptXmlText, 'text/xml');
          
          const receiptTransactions = receiptXmlDoc.querySelectorAll('transactions');
          receiptTransactions.forEach((transaction) => {
            const transactionId = transaction.querySelector('transactionId')?.textContent || '';
            const timestamp = transaction.querySelector('transactionTimestamp')?.textContent || '';
            if (transactionId && timestamp) {
              const dateOnly = timestamp.split(' ')[0];
              transactionDateMap.set(transactionId, dateOnly);
            }
          });
        } catch (fileError) {
          console.warn(`Error processing ${receiptFile}:`, fileError);
        }
      }

      // Fetch both grocery data XML files
      const xmlFiles = ['/Butik_kvittorader.xml', '/Butik_kvittorader_2.xml'];
      const itemMap = new Map<string, GroceryItem>();

      for (const xmlFile of xmlFiles) {
        try {
          const response = await fetch(xmlFile);
          if (!response.ok) continue;

          const xmlText = await response.text();
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
          
          const transactions = xmlDoc.querySelectorAll('transactions');

          transactions.forEach((transaction) => {
            const quantity = parseFloat(transaction.querySelector('quantity')?.textContent || '0');
            const price = parseFloat(transaction.querySelector('price')?.textContent || '0');
            const description = transaction.querySelector('itemDesc')?.textContent || 'Unknown Item';
            const transactionId = transaction.querySelector('transactionId')?.textContent || '';
            const discountValue = parseFloat(transaction.querySelector('discountValue')?.textContent || '0');
            const personalOfferId = transaction.querySelector('personalOfferId')?.textContent || '0';
            const voucherValue = parseFloat(transaction.querySelector('voucherValue')?.textContent || '0');

            if (quantity > 0 && price > 0) {
              const key = description.trim() || 'Unknown Item';
              
              // Only include items that match the search query
              if (key.toLowerCase().includes(query.toLowerCase())) {
                const transactionDate = transactionDateMap.get(transactionId) || new Date().toISOString().split('T')[0];
                
                const transactionData: Transaction = {
                  date: transactionDate,
                  quantity,
                  price,
                  transactionId,
                  discountValue,
                  personalOfferId,
                  voucherValue
                };
                
                if (itemMap.has(key)) {
                  const existing = itemMap.get(key)!;
                  existing.totalQuantity += quantity;
                  existing.totalPrice += price;
                  existing.totalDiscount += Math.abs(discountValue);
                  existing.totalSavings += Math.abs(discountValue) + voucherValue;
                  existing.purchaseCount += 1;
                  existing.averagePrice = existing.totalPrice / existing.totalQuantity;
                  existing.transactions.push(transactionData);
                } else {
                  itemMap.set(key, {
                    description: key,
                    totalQuantity: quantity,
                    totalPrice: price,
                    averagePrice: price,
                    purchaseCount: 1,
                    totalDiscount: Math.abs(discountValue),
                    totalSavings: Math.abs(discountValue) + voucherValue,
                    transactions: [transactionData]
                  });
                }
              }
            }
          });
        } catch (fileError) {
          console.warn(`Error processing ${xmlFile}:`, fileError);
        }
      }

      // Apply date filtering to search results
      let filtered = filterDataByDateRange(Array.from(itemMap.values()));
      
      // Sort and limit results
      const sortedItems = filtered
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 50);

      setItems(sortedItems);
    } catch (err) {
      console.error('Error searching items:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while searching');
    } finally {
      setSearchLoading(false);
    }
  };

  // Filter data based on date range
  const filterDataByDateRange = (items: GroceryItem[]) => {
    if (!dateRange.startDate && !dateRange.endDate) {
      return items;
    }

    return items.map(item => {
      const filteredTransactions = item.transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        const startDate = dateRange.startDate;
        const endDate = dateRange.endDate;

        if (startDate && endDate) {
          return transactionDate >= startDate && transactionDate <= endDate;
        } else if (startDate) {
          return transactionDate >= startDate;
        } else if (endDate) {
          return transactionDate <= endDate;
        }
        return true;
      });

      if (filteredTransactions.length === 0) {
        return null; // Filter out items with no transactions in date range
      }

      // Recalculate statistics based on filtered transactions
      const totalQuantity = filteredTransactions.reduce((sum, t) => sum + t.quantity, 0);
      const totalPrice = filteredTransactions.reduce((sum, t) => sum + t.price, 0);
      const totalDiscount = filteredTransactions.reduce((sum, t) => sum + Math.abs(t.discountValue), 0);
      const totalSavings = filteredTransactions.reduce((sum, t) => sum + Math.abs(t.discountValue) + t.voucherValue, 0);
      const purchaseCount = filteredTransactions.length;
      const averagePrice = totalQuantity > 0 ? totalPrice / totalQuantity : 0;

      return {
        ...item,
        totalQuantity,
        totalPrice,
        totalDiscount,
        totalSavings,
        averagePrice,
        purchaseCount,
        transactions: filteredTransactions
      };
    }).filter((item): item is GroceryItem => item !== null);
  };


  const analyzeGroceryData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch both receipt XML files to get transaction dates
      const receiptFiles = ['/Butik_kvitto.xml', '/Butik_kvitto_2.xml'];
      const transactionDateMap = new Map<string, string>();

      for (const receiptFile of receiptFiles) {
        try {
          const receiptResponse = await fetch(receiptFile);
          if (!receiptResponse.ok) {
            console.warn(`Failed to fetch ${receiptFile}, skipping...`);
            continue;
          }
          const receiptXmlText = await receiptResponse.text();
          const receiptParser = new DOMParser();
          const receiptXmlDoc = receiptParser.parseFromString(receiptXmlText, 'text/xml');
          
          // Create a map of transaction IDs to dates
          const receiptTransactions = receiptXmlDoc.querySelectorAll('transactions');
          receiptTransactions.forEach((transaction) => {
            const transactionId = transaction.querySelector('transactionId')?.textContent || '';
            const timestamp = transaction.querySelector('transactionTimestamp')?.textContent || '';
            if (transactionId && timestamp) {
              // Convert timestamp to date string (format: "2017-05-16 21:17:00" -> "2017-05-16")
              const dateOnly = timestamp.split(' ')[0];
              transactionDateMap.set(transactionId, dateOnly);
            }
          });
        } catch (fileError) {
          console.warn(`Error processing ${receiptFile}:`, fileError);
        }
      }

      // Fetch both grocery data XML files
      const xmlFiles = ['/Butik_kvittorader.xml', '/Butik_kvittorader_2.xml'];
      const itemMap = new Map<string, GroceryItem>();

      for (const xmlFile of xmlFiles) {
        try {
          const response = await fetch(xmlFile);
          if (!response.ok) {
            console.warn(`Failed to fetch ${xmlFile}, skipping...`);
            continue;
          }

          const xmlText = await response.text();
          
          // Parse the XML data
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
          
          // Extract transaction data
          const transactions = xmlDoc.querySelectorAll('transactions');

          transactions.forEach((transaction) => {
            const quantity = parseFloat(transaction.querySelector('quantity')?.textContent || '0');
            const price = parseFloat(transaction.querySelector('price')?.textContent || '0');
            const description = transaction.querySelector('itemDesc')?.textContent || 'Unknown Item';
            const transactionId = transaction.querySelector('transactionId')?.textContent || '';
            const discountValue = parseFloat(transaction.querySelector('discountValue')?.textContent || '0');
            const personalOfferId = transaction.querySelector('personalOfferId')?.textContent || '0';
            const voucherValue = parseFloat(transaction.querySelector('voucherValue')?.textContent || '0');

            if (quantity > 0 && price > 0) {
              const key = description.trim() || 'Unknown Item';
              const transactionDate = transactionDateMap.get(transactionId) || new Date().toISOString().split('T')[0];
              
              const transactionData: Transaction = {
                date: transactionDate,
                quantity,
                price,
                transactionId,
                discountValue,
                personalOfferId,
                voucherValue
              };
              
              if (itemMap.has(key)) {
                const existing = itemMap.get(key)!;
                existing.totalQuantity += quantity;
                existing.totalPrice += price;
                existing.totalDiscount += Math.abs(discountValue); // Store absolute discount value
                existing.totalSavings += Math.abs(discountValue) + voucherValue;
                existing.purchaseCount += 1;
                existing.averagePrice = existing.totalPrice / existing.totalQuantity;
                existing.transactions.push(transactionData);
              } else {
                itemMap.set(key, {
                  description: key,
                  totalQuantity: quantity,
                  totalPrice: price,
                  averagePrice: price,
                  purchaseCount: 1,
                  totalDiscount: Math.abs(discountValue),
                  totalSavings: Math.abs(discountValue) + voucherValue,
                  transactions: [transactionData]
                });
              }
            }
          });
        } catch (fileError) {
          console.warn(`Error processing ${xmlFile}:`, fileError);
          // Continue with other files even if one fails
        }
      }

      // Convert to array and sort by total quantity
      const sortedItems = Array.from(itemMap.values())
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 50); // Top 50 items

      setAllItems(sortedItems);
      setItems(sortedItems);
    } catch (err) {
      console.error('Error analyzing grocery data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while analyzing the data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Analyzing grocery data...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">
          <Typography variant="h6">Error Loading Data</Typography>
          <Typography>{error}</Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        <LocalGroceryStore sx={{ mr: 1, verticalAlign: 'middle' }} />
        Grocery Analysis
      </Typography>
      
      <Typography variant="subtitle1" color="text.secondary" paragraph>
        Most commonly purchased items based on your shopping history
      </Typography>

      {/* Date Range Filter */}
      <Box mb={3}>
        <DateRangeFilter
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onClear={() => setDateRange({ startDate: null, endDate: null })}
          title="Filter by Date Range"
        />
      </Box>

      {/* Search Bar */}
      <Box mb={3}>
        <TextField
          fullWidth
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            }
          }}
        />
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <TrendingUp sx={{ mr: 1, verticalAlign: 'middle' }} />
            Summary
          </Typography>
          <Box display="flex" gap={2} flexWrap="wrap">
            <Chip 
              label={`${items.length} unique items`} 
              color="primary" 
              icon={<ShoppingCart />}
            />
            <Chip 
              label={`${items.reduce((sum, item) => sum + item.purchaseCount, 0)} total purchases`} 
              color="secondary"
            />
            <Chip 
              label={`${items.reduce((sum, item) => sum + item.totalQuantity, 0).toFixed(1)} total quantity`} 
              color="default"
            />
            {items.reduce((sum, item) => sum + item.totalSavings, 0) > 0 && (
              <Chip 
                label={`${items.reduce((sum, item) => sum + item.totalSavings, 0).toFixed(2)} SEK saved`} 
                color="success"
              />
            )}
          </Box>
        </CardContent>
      </Card>

      {searchLoading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
          <Typography variant="h6" sx={{ ml: 2 }}>
            Searching items...
          </Typography>
        </Box>
      ) : (
        <List>
          {items.map((item, index) => (
          <Box key={item.description}>
            <ListItemButton
              onClick={() => router.push(`/grocery-analysis/${encodeURIComponent(item.description)}`)}
              sx={{ 
                '&:hover': { 
                  backgroundColor: 'action.hover' 
                } 
              }}
            >
              <ListItemIcon>
                <Typography variant="h6" color="primary">
                  #{index + 1}
                </Typography>
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">
                      {item.description}
                    </Typography>
                    <Box display="flex" gap={1}>
                      <Chip 
                        label={`${item.totalQuantity.toFixed(1)} units`} 
                        size="small" 
                        color="primary"
                      />
                      <Chip 
                        label={`${item.totalPrice.toFixed(2)} SEK`} 
                        size="small" 
                        color="secondary"
                      />
                      {item.totalSavings > 0 && (
                        <Chip 
                          label={`Saved ${item.totalSavings.toFixed(2)} SEK`} 
                          size="small" 
                          color="success"
                        />
                      )}
                    </Box>
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Average price: {item.averagePrice.toFixed(2)} SEK per unit
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Purchased {item.purchaseCount} times
                      {item.totalDiscount > 0 && ` • ${item.totalDiscount.toFixed(2)} SEK in discounts`}
                    </Typography>
                  </Box>
                }
              />
            </ListItemButton>
            {index < items.length - 1 && <Divider />}
          </Box>
        ))}
        </List>
      )}

      {items.length === 0 && !searchLoading && (
        <Alert severity="info">
          <Typography>
            {allItems.length === 0 
              ? 'No grocery data found. Please ensure the XML file is accessible.'
              : searchQuery.trim()
                ? `No items found matching "${searchQuery}"${dateRange.startDate || dateRange.endDate ? ' in the selected date range' : ''}.`
                : 'No grocery data found in the selected date range.'
            }
          </Typography>
        </Alert>
      )}
    </Box>
  );
}
