'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  ListItemButton,
  Grid
} from '@mui/material';
import {
  ArrowBack,
  Store,
  ShoppingCart,
  TrendingUp,
  CalendarToday,
  AttachMoney,
  LocalGroceryStore
} from '@mui/icons-material';
import DateRangeFilter from '../../../../components/DateRangeFilter';

interface StoreVisit {
  date: string;
  transactionId: string;
  totalAmount: number;
}

interface StoreItem {
  description: string;
  totalQuantity: number;
  totalPrice: number;
  averagePrice: number;
  purchaseCount: number;
  transactions: {
    date: string;
    quantity: number;
    price: number;
    transactionId: string;
  }[];
}

interface StoreDetails {
  storeName: string;
  visitCount: number;
  totalSpent: number;
  averageSpent: number;
  lastVisit: string;
  visits: StoreVisit[];
  items: StoreItem[];
}

export default function StoreDetailPage() {
  const params = useParams();
  const router = useRouter();
  const storeName = decodeURIComponent(params.store as string);
  
  const [storeDetails, setStoreDetails] = useState<StoreDetails | null>(null);
  const [allStoreDetails, setAllStoreDetails] = useState<StoreDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ startDate: Date | null; endDate: Date | null }>({
    startDate: null,
    endDate: null
  });

  useEffect(() => {
    if (storeName) {
      analyzeStoreData(storeName);
    }
  }, [storeName]);

  // Update filtered data when date range changes
  useEffect(() => {
    if (allStoreDetails) {
      const filtered = filterStoreDataByDateRange(allStoreDetails);
      setStoreDetails(filtered);
    }
  }, [dateRange, allStoreDetails]);

  // Filter store data based on date range
  const filterStoreDataByDateRange = (storeData: StoreDetails) => {
    if (!dateRange.startDate && !dateRange.endDate) {
      return storeData;
    }

    // Filter visits
    const filteredVisits = storeData.visits.filter(visit => {
      const visitDate = new Date(visit.date);
      const startDate = dateRange.startDate;
      const endDate = dateRange.endDate;

      if (startDate && endDate) {
        return visitDate >= startDate && visitDate <= endDate;
      } else if (startDate) {
        return visitDate >= startDate;
      } else if (endDate) {
        return visitDate <= endDate;
      }
      return true;
    });

    // Filter item transactions
    const filteredItems = storeData.items.map(item => {
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
        return null;
      }

      // Recalculate item statistics
      const totalQuantity = filteredTransactions.reduce((sum, t) => sum + t.quantity, 0);
      const totalPrice = filteredTransactions.reduce((sum, t) => sum + t.price, 0);
      const purchaseCount = filteredTransactions.length;
      const averagePrice = totalQuantity > 0 ? totalPrice / totalQuantity : 0;

      return {
        ...item,
        totalQuantity,
        totalPrice,
        averagePrice,
        purchaseCount,
        transactions: filteredTransactions
      };
    }).filter((item): item is StoreItem => item !== null);

    // Recalculate store statistics
    const totalSpent = filteredVisits.reduce((sum, visit) => sum + visit.totalAmount, 0);
    const visitCount = filteredVisits.length;
    const averageSpent = visitCount > 0 ? totalSpent / visitCount : 0;
    const lastVisit = filteredVisits.length > 0 
      ? filteredVisits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
      : storeData.lastVisit;

    return {
      ...storeData,
      visitCount,
      totalSpent,
      averageSpent,
      lastVisit,
      visits: filteredVisits,
      items: filteredItems.sort((a, b) => b.totalQuantity - a.totalQuantity)
    };
  };

  const analyzeStoreData = async (storeName: string) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch both receipt XML files to get store information
      const receiptFiles = ['/Butik_kvitto.xml', '/Butik_kvitto_2.xml'];
      const storeVisits: StoreVisit[] = [];
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
          
          // Process each transaction
          const receiptTransactions = receiptXmlDoc.querySelectorAll('transactions');
          receiptTransactions.forEach((transaction) => {
            const transactionId = transaction.querySelector('transactionId')?.textContent || '';
            const currentStoreName = transaction.querySelector('marketingName')?.textContent || 'Unknown Store';
            const timestamp = transaction.querySelector('transactionTimestamp')?.textContent || '';
            const totalAmount = parseFloat(transaction.querySelector('transactionValue')?.textContent || '0');

            if (currentStoreName === storeName && transactionId && timestamp && totalAmount > 0) {
              const dateOnly = timestamp.split(' ')[0];
              transactionDateMap.set(transactionId, dateOnly);
              
              storeVisits.push({
                date: dateOnly,
                transactionId,
                totalAmount
              });
            }
          });
        } catch (fileError) {
          console.warn(`Error processing ${receiptFile}:`, fileError);
        }
      }

      // Fetch grocery data to get items for this store
      const groceryFiles = ['/Butik_kvittorader.xml', '/Butik_kvittorader_2.xml'];
      const itemMap = new Map<string, StoreItem>();

      for (const groceryFile of groceryFiles) {
        try {
          const response = await fetch(groceryFile);
          if (!response.ok) {
            console.warn(`Failed to fetch ${groceryFile}, skipping...`);
            continue;
          }

          const xmlText = await response.text();
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
          
          const transactions = xmlDoc.querySelectorAll('transactions');

          transactions.forEach((transaction) => {
            const quantity = parseFloat(transaction.querySelector('quantity')?.textContent || '0');
            const price = parseFloat(transaction.querySelector('price')?.textContent || '0');
            const description = transaction.querySelector('itemDesc')?.textContent || 'Unknown Item';
            const transactionId = transaction.querySelector('transactionId')?.textContent || '';

            // Only include items from this store
            if (transactionDateMap.has(transactionId) && quantity > 0 && price > 0) {
              const transactionDate = transactionDateMap.get(transactionId)!;
              const key = description.trim() || 'Unknown Item';
              
              const transactionData = {
                date: transactionDate,
                quantity,
                price,
                transactionId
              };
              
              if (itemMap.has(key)) {
                const existing = itemMap.get(key)!;
                existing.totalQuantity += quantity;
                existing.totalPrice += price;
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
                  transactions: [transactionData]
                });
              }
            }
          });
        } catch (fileError) {
          console.warn(`Error processing ${groceryFile}:`, fileError);
        }
      }

      // Calculate store statistics
      const totalSpent = storeVisits.reduce((sum, visit) => sum + visit.totalAmount, 0);
      const visitCount = storeVisits.length;
      const averageSpent = visitCount > 0 ? totalSpent / visitCount : 0;
      const lastVisit = storeVisits.length > 0 
        ? storeVisits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
        : '';

      const storeDetails: StoreDetails = {
        storeName,
        visitCount,
        totalSpent,
        averageSpent,
        lastVisit,
        visits: storeVisits,
        items: Array.from(itemMap.values()).sort((a, b) => b.totalQuantity - a.totalQuantity)
      };

      setAllStoreDetails(storeDetails);
      setStoreDetails(storeDetails);
    } catch (err) {
      console.error('Error analyzing store data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while analyzing the data');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => `${price.toFixed(2)} SEK`;
  const formatDate = (date: string) => new Date(date).toLocaleDateString();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Analyzing store data...
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

  if (!storeDetails) {
    return (
      <Box p={3}>
        <Alert severity="warning">
          <Typography>Store not found or no data available.</Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" alignItems="center" mb={3}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => router.back()}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h4">
          <Store sx={{ mr: 1, verticalAlign: 'middle' }} />
          {storeDetails.storeName}
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

      <Grid container spacing={3}>
        {/* Store Statistics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <ShoppingCart sx={{ mr: 1, verticalAlign: 'middle' }} />
                Store Statistics
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CalendarToday />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Total Visits" 
                    secondary={storeDetails.visitCount.toString()} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <AttachMoney />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Total Spent" 
                    secondary={formatPrice(storeDetails.totalSpent)} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <TrendingUp />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Average per Visit" 
                    secondary={formatPrice(storeDetails.averageSpent)} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CalendarToday />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Last Visit" 
                    secondary={formatDate(storeDetails.lastVisit)} 
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Item Summary */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <LocalGroceryStore sx={{ mr: 1, verticalAlign: 'middle' }} />
                Item Summary
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <Box display="flex" justifyContent="space-between">
                  <Typography>Unique Items:</Typography>
                  <Chip label={storeDetails.items.length.toString()} color="primary" />
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography>Total Quantity:</Typography>
                  <Chip label={storeDetails.items.reduce((sum, item) => sum + item.totalQuantity, 0).toFixed(1)} color="secondary" />
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography>Item Purchases:</Typography>
                  <Chip label={storeDetails.items.reduce((sum, item) => sum + item.purchaseCount, 0).toString()} color="default" />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Visits */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <CalendarToday sx={{ mr: 1, verticalAlign: 'middle' }} />
                Recent Visits
              </Typography>
              {storeDetails.visits.length > 0 ? (
                <List>
                  {storeDetails.visits
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 10)
                    .map((visit, index) => (
                      <Box key={visit.transactionId}>
                        <ListItemButton
                          onClick={() => router.push(`/stores/${encodeURIComponent(storeDetails.storeName)}/visits/${visit.transactionId}`)}
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
                                  {formatDate(visit.date)}
                                </Typography>
                                <Chip 
                                  label={formatPrice(visit.totalAmount)} 
                                  size="small" 
                                  color="secondary"
                                />
                              </Box>
                            }
                            secondary={
                              <Typography variant="body2" color="text.secondary">
                                Transaction ID: {visit.transactionId}
                              </Typography>
                            }
                          />
                        </ListItemButton>
                        {index < Math.min(storeDetails.visits.length, 10) - 1 && <Divider />}
                      </Box>
                    ))}
                </List>
              ) : (
                <Alert severity="info">
                  <Typography>No visits found for this store{dateRange.startDate || dateRange.endDate ? ' in the selected date range' : ''}.</Typography>
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Most Common Items */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <LocalGroceryStore sx={{ mr: 1, verticalAlign: 'middle' }} />
                Most Common Items at This Store
              </Typography>
              {storeDetails.items.length > 0 ? (
                <List>
                  {storeDetails.items.slice(0, 20).map((item, index) => (
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
                                  label={formatPrice(item.totalPrice)} 
                                  size="small" 
                                  color="secondary"
                                />
                              </Box>
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Average price: {formatPrice(item.averagePrice)} per unit
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Purchased {item.purchaseCount} times
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItemButton>
                      {index < Math.min(storeDetails.items.length, 20) - 1 && <Divider />}
                    </Box>
                  ))}
                </List>
              ) : (
                <Alert severity="info">
                  <Typography>No items found for this store{dateRange.startDate || dateRange.endDate ? ' in the selected date range' : ''}.</Typography>
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
