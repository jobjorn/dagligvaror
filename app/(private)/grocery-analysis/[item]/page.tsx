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

interface PriceDataPoint {
  date: string;
  price: number;
  quantity: number;
  transactionId: string;
  store: string;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (itemName) {
      analyzeItemData(itemName);
    }
  }, [itemName]);

  const analyzeItemData = async (itemName: string) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch the XML data
      const response = await fetch('/Butik_kvittorader.xml');
      if (!response.ok) {
        throw new Error('Failed to fetch grocery data');
      }

      const xmlText = await response.text();
      
      // Parse the XML data
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      
      // First, get store information from the receipt data
      const receiptResponse = await fetch('/Butik_kvitto.xml');
      if (!receiptResponse.ok) {
        throw new Error('Failed to fetch receipt data');
      }
      const receiptXmlText = await receiptResponse.text();
      const receiptParser = new DOMParser();
      const receiptXmlDoc = receiptParser.parseFromString(receiptXmlText, 'text/xml');
      
      // Create a map of transaction IDs to store names and dates
      const transactionStoreMap = new Map<string, { store: string; date: string }>();
      const receiptTransactions = receiptXmlDoc.querySelectorAll('transactions');
      receiptTransactions.forEach((transaction) => {
        const transactionId = transaction.querySelector('transactionId')?.textContent || '';
        const storeName = transaction.querySelector('marketingName')?.textContent || 'Unknown Store';
        const timestamp = transaction.querySelector('transactionTimestamp')?.textContent || '';
        transactionStoreMap.set(transactionId, { store: storeName, date: timestamp });
      });

      // Extract transaction data for this specific item
      const transactions = xmlDoc.querySelectorAll('transactions');
      const priceHistory: PriceDataPoint[] = [];
      let totalQuantity = 0;
      let totalPrice = 0;
      let purchaseCount = 0;
      let minPrice = Infinity;
      let maxPrice = 0;

      transactions.forEach((transaction) => {
        const quantity = parseFloat(transaction.querySelector('quantity')?.textContent || '0');
        const price = parseFloat(transaction.querySelector('price')?.textContent || '0');
        const description = transaction.querySelector('itemDesc')?.textContent || '';
        const transactionId = transaction.querySelector('transactionId')?.textContent || '';

        // Check if this transaction is for our item
        if (description.trim() === itemName && quantity > 0 && price > 0) {
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
            store: storeName
          });

          totalQuantity += quantity;
          totalPrice += price;
          purchaseCount += 1;
          minPrice = Math.min(minPrice, unitPrice);
          maxPrice = Math.max(maxPrice, unitPrice);
        }
      });

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

      setItemDetails({
        description: itemName,
        totalQuantity,
        totalPrice,
        averagePrice: totalQuantity > 0 ? totalPrice / totalQuantity : 0,
        purchaseCount,
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
                    secondary={itemDetails.purchaseCount.toString()} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <AttachMoney />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Total Spent" 
                    secondary={formatPrice(itemDetails.totalPrice)} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <LocalGroceryStore />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Total Quantity" 
                    secondary={`${itemDetails.totalQuantity.toFixed(1)} units`} 
                  />
                </ListItem>
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
                  <Chip label={formatPrice(itemDetails.averagePrice)} color="primary" />
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography>Min Price:</Typography>
                  <Chip label={formatPrice(itemDetails.minPrice)} color="success" />
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography>Max Price:</Typography>
                  <Chip label={formatPrice(itemDetails.maxPrice)} color="error" />
                </Box>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography>Price Trend:</Typography>
                  <Chip 
                    label={itemDetails.priceTrend.toUpperCase()} 
                    color={itemDetails.priceTrend === 'up' ? 'error' : itemDetails.priceTrend === 'down' ? 'success' : 'default'}
                    icon={itemDetails.priceTrend === 'up' ? <TrendingUp /> : itemDetails.priceTrend === 'down' ? <TrendingDown /> : undefined}
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
              {itemDetails.chartData.length > 0 ? (
                <Box height={400}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={itemDetails.chartData}>
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
                      {itemDetails.stores.map((store, index) => {
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
                  <Typography>No price history data available for this item.</Typography>
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}