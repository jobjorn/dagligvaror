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
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  ArrowBack,
  TrendingUp,
  TrendingDown,
  LocalGroceryStore,
  CalendarToday,
  AttachMoney,
  ShoppingCart
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import DateRangeFilter from '../../../../components/DateRangeFilter';

interface PriceDataPoint {
  date: string;
  price: number;
  quantity: number;
  transactionId: string;
  store: string;
  discountValue: number;
  personalOfferId: string;
  voucherValue: number;
}

interface ChartDataPoint {
  date: string;
  [key: string]: string | number;
}

interface ItemDetails {
  description: string;
  totalQuantity: number;
  totalPrice: number;
  averagePrice: number;
  purchaseCount: number;
  totalDiscount: number;
  totalSavings: number;
  priceHistory: PriceDataPoint[];
  minPrice: number;
  maxPrice: number;
  priceTrend: 'up' | 'down' | 'stable';
  stores: string[];
  chartData: ChartDataPoint[];
}

export default function ItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const itemName = decodeURIComponent(params.item as string);
  
  const [itemDetails, setItemDetails] = useState<ItemDetails | null>(null);
  const [allPriceHistory, setAllPriceHistory] = useState<PriceDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ startDate: Date | null; endDate: Date | null }>({
    startDate: null,
    endDate: null
  });

  useEffect(() => {
    if (itemName) {
      analyzeItemData(itemName);
    }
  }, [itemName]);

  // Filter data based on date range
  const filterDataByDateRange = (data: PriceDataPoint[]) => {
    if (!dateRange.startDate && !dateRange.endDate) {
      return data;
    }

    return data.filter(item => {
      const itemDate = new Date(item.date);
      const startDate = dateRange.startDate;
      const endDate = dateRange.endDate;

      if (startDate && endDate) {
        return itemDate >= startDate && itemDate <= endDate;
      } else if (startDate) {
        return itemDate >= startDate;
      } else if (endDate) {
        return itemDate <= endDate;
      }
      return true;
    });
  };

  // Get filtered data
  const filteredPriceHistory = filterDataByDateRange(allPriceHistory);

  // Recalculate statistics based on filtered data
  const recalculateStats = (priceHistory: PriceDataPoint[]) => {
    if (priceHistory.length === 0) {
      return {
        totalQuantity: 0,
        totalPrice: 0,
        averagePrice: 0,
        purchaseCount: 0,
        totalDiscount: 0,
        totalSavings: 0,
        minPrice: 0,
        maxPrice: 0,
        priceTrend: 'stable' as const,
        stores: [] as string[],
        chartData: [] as ChartDataPoint[]
      };
    }

    let totalQuantity = 0;
    let totalPrice = 0;
    let totalDiscount = 0;
    let totalSavings = 0;
    let purchaseCount = 0;
    let minPrice = Infinity;
    let maxPrice = 0;

    priceHistory.forEach(item => {
      totalQuantity += item.quantity;
      totalPrice += item.price * item.quantity;
      totalDiscount += Math.abs(item.discountValue);
      totalSavings += Math.abs(item.discountValue) + item.voucherValue;
      purchaseCount += 1;
      minPrice = Math.min(minPrice, item.price);
      maxPrice = Math.max(maxPrice, item.price);
    });

    // Calculate price trend
    let priceTrend: 'up' | 'down' | 'stable' = 'stable';
    if (priceHistory.length >= 2) {
      const firstHalf = priceHistory.slice(0, Math.floor(priceHistory.length / 2));
      const secondHalf = priceHistory.slice(Math.floor(priceHistory.length / 2));
      
      const firstHalfAvg = firstHalf.reduce((sum, item) => sum + item.price, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, item) => sum + item.price, 0) / secondHalf.length;
      
      const trendThreshold = 0.1; // 10% change threshold
      const changePercent = (secondHalfAvg - firstHalfAvg) / firstHalfAvg;
      
      if (changePercent > trendThreshold) {
        priceTrend = 'up';
      } else if (changePercent < -trendThreshold) {
        priceTrend = 'down';
      }
    }

    // Get unique stores
    const stores = [...new Set(priceHistory.map(item => item.store))];

    // Generate chart data
    const datesOnly = priceHistory.map(item => item.date);
    const minDate = new Date(Math.min(...datesOnly.map(d => new Date(d).getTime())));
    const maxDate = new Date(Math.max(...datesOnly.map(d => new Date(d).getTime())));

    const allDates: string[] = [];
    if (minDate && maxDate) {
      let currentDate = new Date(minDate);
      while (currentDate <= maxDate) {
        allDates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    const chartDataMap = new Map<string, ChartDataPoint>();
    allDates.forEach(date => {
      chartDataMap.set(date, { date: date });
    });

    priceHistory.forEach(item => {
      let chartPoint = chartDataMap.get(item.date);
      if (!chartPoint) {
        chartPoint = { date: item.date };
        chartDataMap.set(item.date, chartPoint);
      }
      chartPoint[item.store] = item.price;
    });

    const chartData = Array.from(chartDataMap.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return {
      totalQuantity,
      totalPrice,
      averagePrice: totalQuantity > 0 ? totalPrice / totalQuantity : 0,
      purchaseCount,
      totalDiscount,
      totalSavings,
      minPrice: minPrice === Infinity ? 0 : minPrice,
      maxPrice,
      priceTrend,
      stores,
      chartData
    };
  };

  const filteredStats = recalculateStats(filteredPriceHistory);

  const analyzeItemData = async (itemName: string) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch both receipt XML files to get store information
      const receiptFiles = ['/Butik_kvitto.xml', '/Butik_kvitto_2.xml'];
      const transactionStoreMap = new Map<string, { store: string; date: string }>();

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
          
          // Create a map of transaction IDs to store names and dates
          const receiptTransactions = receiptXmlDoc.querySelectorAll('transactions');
          receiptTransactions.forEach((transaction) => {
            const transactionId = transaction.querySelector('transactionId')?.textContent || '';
            const storeName = transaction.querySelector('marketingName')?.textContent || 'Unknown Store';
            const timestamp = transaction.querySelector('transactionTimestamp')?.textContent || '';
            transactionStoreMap.set(transactionId, { store: storeName, date: timestamp });
          });
        } catch (fileError) {
          console.warn(`Error processing ${receiptFile}:`, fileError);
          // Continue with other files even if one fails
        }
      }

      // Fetch both grocery data XML files
      const groceryFiles = ['/Butik_kvittorader.xml', '/Butik_kvittorader_2.xml'];
      const priceHistory: PriceDataPoint[] = [];
      let totalQuantity = 0;
      let totalPrice = 0;
      let purchaseCount = 0;
      let minPrice = Infinity;
      let maxPrice = 0;

      for (const groceryFile of groceryFiles) {
        try {
          const response = await fetch(groceryFile);
          if (!response.ok) {
            console.warn(`Failed to fetch ${groceryFile}, skipping...`);
            continue;
          }

          const xmlText = await response.text();
          
          // Parse the XML data
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
          
          // Extract transaction data for this specific item
          const transactions = xmlDoc.querySelectorAll('transactions');

          transactions.forEach((transaction) => {
            const quantity = parseFloat(transaction.querySelector('quantity')?.textContent || '0');
            const price = parseFloat(transaction.querySelector('price')?.textContent || '0');
            const description = transaction.querySelector('itemDesc')?.textContent || '';
            const transactionId = transaction.querySelector('transactionId')?.textContent || '';
            const discountValue = parseFloat(transaction.querySelector('discountValue')?.textContent || '0');
            const personalOfferId = transaction.querySelector('personalOfferId')?.textContent || '0';
            const voucherValue = parseFloat(transaction.querySelector('voucherValue')?.textContent || '0');

            // Check if this transaction is for our item
            // Handle "Unknown Item" case where description might be empty
            const normalizedDescription = description.trim() || 'Unknown Item';
            if (normalizedDescription === itemName && quantity > 0 && price > 0) {
              const unitPrice = price / quantity;
              const transactionInfo = transactionStoreMap.get(transactionId);
              const storeName = transactionInfo?.store || 'Unknown Store';
              const transactionDate = transactionInfo?.date || new Date().toISOString().split('T')[0];
              
              // Convert timestamp to date string (format: "2017-05-16 21:17:00" -> "2017-05-16")
              const dateOnly = transactionDate.split(' ')[0];
              
              // Normalize date format to ensure consistency
              const normalizedDate = new Date(dateOnly).toISOString().split('T')[0];
              
              priceHistory.push({
                date: normalizedDate,
                price: unitPrice,
                quantity: quantity,
                transactionId: transactionId,
                store: storeName,
                discountValue,
                personalOfferId,
                voucherValue
              });

              totalQuantity += quantity;
              totalPrice += price;
              purchaseCount += 1;
              minPrice = Math.min(minPrice, unitPrice);
              maxPrice = Math.max(maxPrice, unitPrice);
            }
          });
        } catch (fileError) {
          console.warn(`Error processing ${groceryFile}:`, fileError);
          // Continue with other files even if one fails
        }
      }

      // Calculate price trend
      let priceTrend: 'up' | 'down' | 'stable' = 'stable';
      if (priceHistory.length >= 2) {
        const firstHalf = priceHistory.slice(0, Math.floor(priceHistory.length / 2));
        const secondHalf = priceHistory.slice(Math.floor(priceHistory.length / 2));
        
        const firstAvg = firstHalf.reduce((sum, p) => sum + p.price, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, p) => sum + p.price, 0) / secondHalf.length;
        
        if (secondAvg > firstAvg * 1.05) priceTrend = 'up';
        else if (secondAvg < firstAvg * 0.95) priceTrend = 'down';
      }

      // Sort price history by date
      priceHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Get unique stores
      const stores = Array.from(new Set(priceHistory.map(item => item.store)));

      // Create a complete date range from first to last purchase
      const datesOnly = priceHistory.map(item => item.date);
      let minDate: Date | null = null;
      let maxDate: Date | null = null;

      if (datesOnly.length > 0) {
        minDate = new Date(Math.min(...datesOnly.map(d => new Date(d).getTime())));
        maxDate = new Date(Math.max(...datesOnly.map(d => new Date(d).getTime())));
      }

      const allDates: string[] = [];
      if (minDate && maxDate) {
        let currentDate = new Date(minDate);
        while (currentDate <= maxDate) {
          allDates.push(currentDate.toISOString().split('T')[0]);
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }

      // Initialize chart data with all dates in the range
      const chartDataMap = new Map<string, ChartDataPoint>();
      allDates.forEach(date => {
        chartDataMap.set(date, { date: date });
      });

      // Populate with actual purchase data
      priceHistory.forEach(item => {
        let chartPoint = chartDataMap.get(item.date);
        if (!chartPoint) {
          // If date not found, add it to the chart data map
          console.warn(`Date ${item.date} not found in chart data map, adding it`);
          chartPoint = { date: item.date };
          chartDataMap.set(item.date, chartPoint);
        }
        // If multiple purchases from same store on same date, use the last one
        chartPoint[item.store] = item.price;
      });

      const chartData = Array.from(chartDataMap.values()).sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Debug logging
      console.log('Price history:', priceHistory);
      console.log('All dates generated:', allDates);
      console.log('Chart data map keys:', Array.from(chartDataMap.keys()));
      console.log('Chart data:', chartData);
      console.log('Stores:', stores);

      // Store all price history for filtering
      setAllPriceHistory(priceHistory);

      setItemDetails({
        description: itemName,
        totalQuantity,
        totalPrice,
        averagePrice: totalQuantity > 0 ? totalPrice / totalQuantity : 0,
        purchaseCount,
        totalDiscount: priceHistory.reduce((sum, item) => sum + Math.abs(item.discountValue), 0),
        totalSavings: priceHistory.reduce((sum, item) => sum + Math.abs(item.discountValue) + item.voucherValue, 0),
        priceHistory,
        minPrice: minPrice === Infinity ? 0 : minPrice,
        maxPrice,
        priceTrend,
        stores,
        chartData
      });
    } catch (err) {
      console.error('Error analyzing item data:', err);
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
          Analyzing item data...
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

  if (!itemDetails) {
    return (
      <Box p={3}>
        <Alert severity="warning">
          <Typography>Item not found or no data available.</Typography>
        </Alert>
      </Box>
    );
  }

  const formatPrice = (price: number) => `${price.toFixed(2)} SEK`;
  const formatDate = (date: string) => new Date(date).toLocaleDateString();

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
          <LocalGroceryStore sx={{ mr: 1, verticalAlign: 'middle' }} />
          {itemDetails.description}
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
        {/* Summary Cards */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <ShoppingCart sx={{ mr: 1, verticalAlign: 'middle' }} />
                Purchase Summary
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CalendarToday />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Times Purchased" 
                    secondary={filteredStats.purchaseCount.toString()} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <AttachMoney />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Total Spent" 
                    secondary={formatPrice(filteredStats.totalPrice)} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <LocalGroceryStore />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Total Quantity" 
                    secondary={`${filteredStats.totalQuantity.toFixed(1)} units`} 
                  />
                </ListItem>
                {filteredStats.totalSavings > 0 && (
                  <ListItem>
                    <ListItemIcon>
                      <TrendingDown />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Total Savings" 
                      secondary={formatPrice(filteredStats.totalSavings)} 
                    />
                  </ListItem>
                )}
                {filteredStats.totalDiscount > 0 && (
                  <ListItem>
                    <ListItemIcon>
                      <AttachMoney />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Total Discounts" 
                      secondary={formatPrice(filteredStats.totalDiscount)} 
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <TrendingUp sx={{ mr: 1, verticalAlign: 'middle' }} />
                Price Analysis
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <Box display="flex" justifyContent="space-between">
                  <Typography>Average Price:</Typography>
                  <Chip label={formatPrice(filteredStats.averagePrice)} color="primary" />
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography>Min Price:</Typography>
                  <Chip label={formatPrice(filteredStats.minPrice)} color="success" />
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography>Max Price:</Typography>
                  <Chip label={formatPrice(filteredStats.maxPrice)} color="error" />
                </Box>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography>Price Trend:</Typography>
                  <Chip 
                    label={filteredStats.priceTrend.toUpperCase()} 
                    color={filteredStats.priceTrend === 'up' ? 'error' : filteredStats.priceTrend === 'down' ? 'success' : 'default'}
                    icon={filteredStats.priceTrend === 'up' ? <TrendingUp /> : filteredStats.priceTrend === 'down' ? <TrendingDown /> : undefined}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Price History Chart */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Price History Over Time by Store
              </Typography>
              {filteredStats.chartData.length > 0 ? (
                <Box height={400}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={filteredStats.chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={formatDate}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        domain={['dataMin - 1', 'dataMax + 1']}
                        tickFormatter={(value) => `${value.toFixed(1)} SEK`}
                      />
                      <Tooltip 
                        labelFormatter={(label) => `Date: ${formatDate(label)}`}
                        formatter={(value: number, name: string) => [
                          `${value.toFixed(2)} SEK`,
                          `${name} - Price per Unit`
                        ]}
                      />
                      <Legend />
                      {filteredStats.stores.map((store, index) => {
                        const colors = ['#1976d2', '#dc004e', '#9c27b0', '#00acc1', '#4caf50', '#ff9800', '#f44336', '#795548'];
                        const color = colors[index % colors.length];
                        return (
                          <Line
                            key={store}
                            type="monotone"
                            dataKey={store}
                            stroke={color}
                            strokeWidth={2}
                            dot={{ fill: color, strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, stroke: color, strokeWidth: 2 }}
                            name={store}
                            connectNulls={true}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Alert severity="info">
                  <Typography>No price history data available for this item{dateRange.startDate || dateRange.endDate ? ' in the selected date range' : ''}.</Typography>
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Purchase History List */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <ShoppingCart sx={{ mr: 1, verticalAlign: 'middle' }} />
                Purchase History
              </Typography>
              {filteredPriceHistory.length > 0 ? (
                <List>
                  {filteredPriceHistory
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Sort by date, newest first
                    .map((purchase, index) => (
                      <Box key={`${purchase.transactionId}-${index}`}>
                        <ListItem>
                          <ListItemIcon>
                            <CalendarToday />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap">
                                <Typography variant="subtitle1">
                                  {formatDate(purchase.date)}
                                </Typography>
                                <Box display="flex" gap={1} flexWrap="wrap">
                                  <Chip 
                                    label={`${purchase.quantity.toFixed(1)} units`} 
                                    size="small" 
                                    color="primary"
                                  />
                                  <Chip 
                                    label={`${purchase.price.toFixed(2)} SEK/unit`} 
                                    size="small" 
                                    color="secondary"
                                  />
                                  <Chip 
                                    label={`${(purchase.price * purchase.quantity).toFixed(2)} SEK total`} 
                                    size="small" 
                                    color="default"
                                  />
                                  {(Math.abs(purchase.discountValue) > 0 || purchase.voucherValue > 0) && (
                                    <Chip 
                                      label={`Saved ${(Math.abs(purchase.discountValue) + purchase.voucherValue).toFixed(2)} SEK`} 
                                      size="small" 
                                      color="success"
                                    />
                                  )}
                                </Box>
                              </Box>
                            }
                            secondary={
                              <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap">
                                <Typography variant="body2" color="text.secondary">
                                  Store: {purchase.store}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Transaction ID: {purchase.transactionId}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < filteredPriceHistory.length - 1 && <Divider />}
                      </Box>
                    ))}
                </List>
              ) : (
                <Alert severity="info">
                  <Typography>No purchase history available for this item{dateRange.startDate || dateRange.endDate ? ' in the selected date range' : ''}.</Typography>
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}