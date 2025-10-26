'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Button,
  Chip,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  Link
} from '@mui/material';
import {
  Store,
  CompareArrows,
  TrendingUp,
  TrendingDown,
  AttachMoney,
  ShoppingCart,
  CalendarToday
} from '@mui/icons-material';
import DateRangeFilter from '../../../components/DateRangeFilter';

interface StoreData {
  storeName: string;
  visitCount: number;
  totalSpent: number;
  averagePerVisit: number;
  lastVisit: string;
}

interface ItemComparison {
  itemName: string;
  store1Data: {
    storeName: string;
    averagePrice: number;
    mostRecentPrice: number;
    mostRecentDate: string;
    purchaseCount: number;
    totalQuantity: number;
    totalSpent: number;
  };
  store2Data: {
    storeName: string;
    averagePrice: number;
    mostRecentPrice: number;
    mostRecentDate: string;
    purchaseCount: number;
    totalQuantity: number;
    totalSpent: number;
  };
  cheaperStore: string;
  priceDifference: number;
  priceDifferencePercent: number;
}

interface Transaction {
  date: string;
  quantity: number;
  price: number;
  transactionId: string;
  discountValue: number;
  personalOfferId: string;
  voucherValue: number;
}

export default function StoreComparisonPage() {
  const [stores, setStores] = useState<StoreData[]>([]);
  const [allStores, setAllStores] = useState<StoreData[]>([]);
  const [selectedStore1, setSelectedStore1] = useState<string>('');
  const [selectedStore2, setSelectedStore2] = useState<string>('');
  const [comparisonData, setComparisonData] = useState<ItemComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ startDate: Date | null; endDate: Date | null }>({
    startDate: null,
    endDate: null
  });

  useEffect(() => {
    analyzeStoreData();
  }, []);

  // Filter data based on date range
  const filterDataByDateRange = (data: StoreData[]) => {
    if (!dateRange.startDate && !dateRange.endDate) {
      return data;
    }

    return data.filter(store => {
      const lastVisitDate = new Date(store.lastVisit);
      const startDate = dateRange.startDate;
      const endDate = dateRange.endDate;

      if (startDate && endDate) {
        return lastVisitDate >= startDate && lastVisitDate <= endDate;
      } else if (startDate) {
        return lastVisitDate >= startDate;
      } else if (endDate) {
        return lastVisitDate <= endDate;
      }
      return true;
    });
  };

  // Update stores when date range changes
  useEffect(() => {
    const filtered = filterDataByDateRange(allStores);
    setStores(filtered);
  }, [dateRange, allStores]);

  const analyzeStoreData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch both receipt XML files
      const receiptFiles = ['/Butik_kvitto.xml', '/Butik_kvitto_2.xml'];
      const storeMap = new Map<string, StoreData>();

      for (const receiptFile of receiptFiles) {
        try {
          const response = await fetch(receiptFile);
          if (!response.ok) {
            console.warn(`Failed to fetch ${receiptFile}, skipping...`);
            continue;
          }

          const xmlText = await response.text();
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
          
          const transactions = xmlDoc.querySelectorAll('transactions');

          transactions.forEach((transaction) => {
            const storeName = transaction.querySelector('marketingName')?.textContent || 'Unknown Store';
            const transactionValue = parseFloat(transaction.querySelector('transactionValue')?.textContent || '0');
            const timestamp = transaction.querySelector('transactionTimestamp')?.textContent || '';

            if (storeName && transactionValue > 0) {
              const dateOnly = timestamp.split(' ')[0];
              
              if (storeMap.has(storeName)) {
                const existing = storeMap.get(storeName)!;
                existing.visitCount += 1;
                existing.totalSpent += transactionValue;
                existing.averagePerVisit = existing.totalSpent / existing.visitCount;
                if (dateOnly > existing.lastVisit) {
                  existing.lastVisit = dateOnly;
                }
              } else {
                storeMap.set(storeName, {
                  storeName,
                  visitCount: 1,
                  totalSpent: transactionValue,
                  averagePerVisit: transactionValue,
                  lastVisit: dateOnly
                });
              }
            }
          });
        } catch (fileError) {
          console.warn(`Error processing ${receiptFile}:`, fileError);
        }
      }

      const storeList = Array.from(storeMap.values())
        .sort((a, b) => b.visitCount - a.visitCount);

      setAllStores(storeList);
      setStores(storeList);
    } catch (err) {
      console.error('Error analyzing store data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while analyzing the data');
    } finally {
      setLoading(false);
    }
  };

  const compareStores = async () => {
    if (!selectedStore1 || !selectedStore2) {
      setError('Please select both stores to compare');
      return;
    }

    if (selectedStore1 === selectedStore2) {
      setError('Please select two different stores');
      return;
    }

    try {
      setComparing(true);
      setError(null);

      // Fetch both receipt XML files to get store information
      const receiptFiles = ['/Butik_kvitto.xml', '/Butik_kvitto_2.xml'];
      const transactionStoreMap = new Map<string, { store: string; date: string }>();

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
            const storeName = transaction.querySelector('marketingName')?.textContent || 'Unknown Store';
            const timestamp = transaction.querySelector('transactionTimestamp')?.textContent || '';
            if (transactionId && storeName) {
              const dateOnly = timestamp.split(' ')[0];
              transactionStoreMap.set(transactionId, { store: storeName, date: dateOnly });
            }
          });
        } catch (fileError) {
          console.warn(`Error processing ${receiptFile}:`, fileError);
        }
      }

      // Fetch both grocery data XML files
      const groceryFiles = ['/Butik_kvittorader.xml', '/Butik_kvittorader_2.xml'];
      const itemStoreMap = new Map<string, Map<string, Transaction[]>>();

      for (const groceryFile of groceryFiles) {
        try {
          const response = await fetch(groceryFile);
          if (!response.ok) continue;

          const xmlText = await response.text();
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
          
          const transactions = xmlDoc.querySelectorAll('transactions');

          transactions.forEach((transaction) => {
            const quantity = parseFloat(transaction.querySelector('quantity')?.textContent || '0');
            const price = parseFloat(transaction.querySelector('price')?.textContent || '0');
            const description = transaction.querySelector('itemDesc')?.textContent || '';
            const transactionId = transaction.querySelector('transactionId')?.textContent || '';
            const discountValue = parseFloat(transaction.querySelector('discountValue')?.textContent || '0');
            const personalOfferId = transaction.querySelector('personalOfferId')?.textContent || '0';
            const voucherValue = parseFloat(transaction.querySelector('voucherValue')?.textContent || '0');

            if (quantity > 0 && price > 0) {
              const itemName = description.trim() || 'Unknown Item';
              const transactionInfo = transactionStoreMap.get(transactionId);
              
              if (transactionInfo && (transactionInfo.store === selectedStore1 || transactionInfo.store === selectedStore2)) {
                const unitPrice = price / quantity; // Calculate unit price
                const transactionData: Transaction = {
                  date: transactionInfo.date,
                  quantity,
                  price: unitPrice, // Store unit price, not total price
                  transactionId,
                  discountValue,
                  personalOfferId,
                  voucherValue
                };

                if (!itemStoreMap.has(itemName)) {
                  itemStoreMap.set(itemName, new Map());
                }
                
                const itemStores = itemStoreMap.get(itemName)!;
                if (!itemStores.has(transactionInfo.store)) {
                  itemStores.set(transactionInfo.store, []);
                }
                
                itemStores.get(transactionInfo.store)!.push(transactionData);
              }
            }
          });
        } catch (fileError) {
          console.warn(`Error processing ${groceryFile}:`, fileError);
        }
      }

      // Find items bought at both stores and compare prices
      const comparisons: ItemComparison[] = [];

      itemStoreMap.forEach((storeMap, itemName) => {
        const store1Transactions = storeMap.get(selectedStore1) || [];
        const store2Transactions = storeMap.get(selectedStore2) || [];

        if (store1Transactions.length > 0 && store2Transactions.length > 0) {
          // Apply date filtering
          const filteredStore1 = filterTransactionsByDate(store1Transactions);
          const filteredStore2 = filterTransactionsByDate(store2Transactions);

          if (filteredStore1.length > 0 && filteredStore2.length > 0) {
            const store1Data = calculateStoreData(selectedStore1, filteredStore1);
            const store2Data = calculateStoreData(selectedStore2, filteredStore2);

            const cheaperStore = store1Data.mostRecentPrice < store2Data.mostRecentPrice ? selectedStore1 : selectedStore2;
            const priceDifference = Math.abs(store1Data.mostRecentPrice - store2Data.mostRecentPrice);
            const priceDifferencePercent = ((store2Data.mostRecentPrice - store1Data.mostRecentPrice) / store1Data.mostRecentPrice) * 100;

            comparisons.push({
              itemName,
              store1Data,
              store2Data,
              cheaperStore,
              priceDifference,
              priceDifferencePercent
            });
          }
        }
      });

      // Sort by price difference (largest savings first)
      comparisons.sort((a, b) => b.priceDifference - a.priceDifference);

      setComparisonData(comparisons);
    } catch (err) {
      console.error('Error comparing stores:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while comparing stores');
    } finally {
      setComparing(false);
    }
  };

  const filterTransactionsByDate = (transactions: Transaction[]) => {
    if (!dateRange.startDate && !dateRange.endDate) {
      return transactions;
    }

    return transactions.filter(transaction => {
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
  };

  const calculateStoreData = (storeName: string, transactions: Transaction[]) => {
    const totalQuantity = transactions.reduce((sum, t) => sum + t.quantity, 0);
    const totalSpent = transactions.reduce((sum, t) => sum + (t.price * t.quantity), 0);
    const averagePrice = totalQuantity > 0 ? totalSpent / totalQuantity : 0;
    const purchaseCount = transactions.length;

    // Find the most recent price and date (sort by date and get the latest)
    const sortedTransactions = transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const mostRecentPrice = sortedTransactions.length > 0 ? sortedTransactions[0].price : 0;
    const mostRecentDate = sortedTransactions.length > 0 ? sortedTransactions[0].date : '';

    return {
      storeName,
      averagePrice,
      mostRecentPrice,
      mostRecentDate,
      purchaseCount,
      totalQuantity,
      totalSpent
    };
  };

  const formatPrice = (price: number) => `${price.toFixed(2)} SEK`;
  
  const formatDateAgo = (date: string) => {
    const now = new Date();
    const purchaseDate = new Date(date);
    const diffInMs = now.getTime() - purchaseDate.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return 'Today';
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 30) {
      return `${diffInDays} days ago`;
    } else if (diffInDays < 365) {
      const months = Math.floor(diffInDays / 30);
      return months === 1 ? '1 month ago' : `${months} months ago`;
    } else {
      const years = Math.floor(diffInDays / 365);
      return years === 1 ? '1 year ago' : `${years} years ago`;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading store data...
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
      <Box display="flex" alignItems="center" mb={3}>
        <CompareArrows sx={{ mr: 1, fontSize: 32, color: 'primary.main' }} />
        <Typography variant="h4">
          Store Comparison
        </Typography>
      </Box>

      {/* Date Range Filter */}
      <Box mb={3}>
        <DateRangeFilter
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onClear={() => setDateRange({ startDate: null, endDate: null })}
          title="Filter by Date Range"
        />
      </Box>

      {/* Store Selection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <Store sx={{ mr: 1, verticalAlign: 'middle' }} />
            Select Stores to Compare
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>First Store</InputLabel>
                <Select
                  value={selectedStore1}
                  onChange={(e) => setSelectedStore1(e.target.value)}
                  label="First Store"
                >
                  {stores.map((store) => (
                    <MenuItem key={store.storeName} value={store.storeName}>
                      {store.storeName} ({store.visitCount} visits)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Second Store</InputLabel>
                <Select
                  value={selectedStore2}
                  onChange={(e) => setSelectedStore2(e.target.value)}
                  label="Second Store"
                >
                  {stores.map((store) => (
                    <MenuItem key={store.storeName} value={store.storeName}>
                      {store.storeName} ({store.visitCount} visits)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <Box mt={2}>
            <Button
              variant="contained"
              onClick={compareStores}
              disabled={!selectedStore1 || !selectedStore2 || comparing}
              startIcon={comparing ? <CircularProgress size={20} /> : <CompareArrows />}
            >
              {comparing ? 'Comparing...' : 'Compare Stores'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {comparisonData.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <ShoppingCart sx={{ mr: 1, verticalAlign: 'middle' }} />
              Items Bought at Both Stores ({comparisonData.length} items)
            </Typography>
            
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell align="center">{selectedStore1}<br /><Typography variant="caption">(Most Recent Price)</Typography></TableCell>
                    <TableCell align="center">{selectedStore2}<br /><Typography variant="caption">(Most Recent Price)</Typography></TableCell>
                    <TableCell align="center">Cheaper Store</TableCell>
                    <TableCell align="center">Price Difference</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {comparisonData.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Link
                          href={`/grocery-analysis/${encodeURIComponent(item.itemName)}`}
                          sx={{
                            textDecoration: 'none',
                            color: 'primary.main',
                            '&:hover': {
                              textDecoration: 'underline'
                            }
                          }}
                        >
                          <Typography variant="subtitle2">
                            {item.itemName}
                          </Typography>
                        </Link>
                        <Typography variant="body2" color="text.secondary">
                          {item.store1Data.purchaseCount + item.store2Data.purchaseCount} total purchases
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">
                          {formatPrice(item.store1Data.mostRecentPrice)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.store1Data.purchaseCount} purchases
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Last: {formatDateAgo(item.store1Data.mostRecentDate)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">
                          {formatPrice(item.store2Data.mostRecentPrice)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.store2Data.purchaseCount} purchases
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Last: {formatDateAgo(item.store2Data.mostRecentDate)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={item.cheaperStore}
                          color={item.cheaperStore === selectedStore1 ? 'primary' : 'secondary'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box display="flex" alignItems="center" justifyContent="center">
                          {item.priceDifferencePercent > 0 ? (
                            <TrendingDown color="success" />
                          ) : (
                            <TrendingUp color="error" />
                          )}
                          <Typography
                            variant="body2"
                            color={item.priceDifferencePercent > 0 ? 'success.main' : 'error.main'}
                            sx={{ ml: 0.5 }}
                          >
                            {formatPrice(item.priceDifference)}
                            <br />
                            ({item.priceDifferencePercent.toFixed(1)}%)
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {comparisonData.length === 0 && selectedStore1 && selectedStore2 && !comparing && (
        <Card>
          <CardContent>
            <Alert severity="info">
              <Typography variant="h6">No Common Items Found</Typography>
              <Typography>
                No items were found that you've purchased at both {selectedStore1} and {selectedStore2} 
                {dateRange.startDate || dateRange.endDate ? ' in the selected date range' : ''}.
              </Typography>
            </Alert>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
