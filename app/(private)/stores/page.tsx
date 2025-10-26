'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  ListItemButton
} from '@mui/material';
import { Store, ShoppingCart, TrendingUp, CalendarToday, AttachMoney } from '@mui/icons-material';
import DateRangeFilter from '../../../components/DateRangeFilter';

interface StoreVisit {
  date: string;
  transactionId: string;
  totalAmount: number;
}

interface StoreStats {
  storeName: string;
  visitCount: number;
  totalSpent: number;
  averageSpent: number;
  lastVisit: string;
  visits: StoreVisit[];
}

export default function StoresPage() {
  const router = useRouter();
  const [stores, setStores] = useState<StoreStats[]>([]);
  const [allStores, setAllStores] = useState<StoreStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ startDate: Date | null; endDate: Date | null }>({
    startDate: null,
    endDate: null
  });

  useEffect(() => {
    analyzeStoreData();
  }, []);

  // Update filtered stores when date range changes
  useEffect(() => {
    const filtered = filterStoresByDateRange(allStores)
      .sort((a, b) => b.visitCount - a.visitCount);
    setStores(filtered);
  }, [dateRange, allStores]);

  // Filter stores based on date range
  const filterStoresByDateRange = (stores: StoreStats[]) => {
    if (!dateRange.startDate && !dateRange.endDate) {
      return stores;
    }

    return stores.map(store => {
      const filteredVisits = store.visits.filter(visit => {
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

      if (filteredVisits.length === 0) {
        return null; // Filter out stores with no visits in date range
      }

      // Recalculate statistics based on filtered visits
      const totalSpent = filteredVisits.reduce((sum, visit) => sum + visit.totalAmount, 0);
      const visitCount = filteredVisits.length;
      const averageSpent = visitCount > 0 ? totalSpent / visitCount : 0;
      const lastVisit = filteredVisits.length > 0 
        ? filteredVisits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
        : store.lastVisit;

      return {
        ...store,
        visitCount,
        totalSpent,
        averageSpent,
        lastVisit,
        visits: filteredVisits
      };
    }).filter((store): store is StoreStats => store !== null);
  };

  const analyzeStoreData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch both receipt XML files to get store information
      const receiptFiles = ['/Butik_kvitto.xml', '/Butik_kvitto_2.xml'];
      const storeMap = new Map<string, StoreStats>();

      for (const receiptFile of receiptFiles) {
        try {
          console.log(`Fetching ${receiptFile}...`);
          const receiptResponse = await fetch(receiptFile);
          if (!receiptResponse.ok) {
            console.warn(`Failed to fetch ${receiptFile}, skipping...`);
            continue;
          }
          const receiptXmlText = await receiptResponse.text();
          console.log(`Successfully fetched ${receiptFile}, length:`, receiptXmlText.length);
          const receiptParser = new DOMParser();
          const receiptXmlDoc = receiptParser.parseFromString(receiptXmlText, 'text/xml');
          
          // Process each transaction
          const receiptTransactions = receiptXmlDoc.querySelectorAll('transactions');
          console.log(`Found ${receiptTransactions.length} transactions in ${receiptFile}`);
          receiptTransactions.forEach((transaction) => {
            const transactionId = transaction.querySelector('transactionId')?.textContent || '';
            const storeName = transaction.querySelector('marketingName')?.textContent || 'Unknown Store';
            const timestamp = transaction.querySelector('transactionTimestamp')?.textContent || '';
            const totalAmount = parseFloat(transaction.querySelector('transactionValue')?.textContent || '0');

            if (transactionId && timestamp && totalAmount > 0) {
              // Convert timestamp to date string
              const dateOnly = timestamp.split(' ')[0];
              
              const visit: StoreVisit = {
                date: dateOnly,
                transactionId,
                totalAmount
              };

              if (storeMap.has(storeName)) {
                const existing = storeMap.get(storeName)!;
                existing.visits.push(visit);
                existing.visitCount += 1;
                existing.totalSpent += totalAmount;
                existing.averageSpent = existing.totalSpent / existing.visitCount;
                // Update last visit if this is more recent
                if (new Date(dateOnly) > new Date(existing.lastVisit)) {
                  existing.lastVisit = dateOnly;
                }
              } else {
                storeMap.set(storeName, {
                  storeName,
                  visitCount: 1,
                  totalSpent: totalAmount,
                  averageSpent: totalAmount,
                  lastVisit: dateOnly,
                  visits: [visit]
                });
              }
            }
          });
        } catch (fileError) {
          console.warn(`Error processing ${receiptFile}:`, fileError);
        }
      }

      // Convert to array and sort by visit count
      const sortedStores = Array.from(storeMap.values())
        .sort((a, b) => b.visitCount - a.visitCount);

      console.log('Store data loaded:', sortedStores.length, 'stores');
      console.log('Sample store:', sortedStores[0]);

      setAllStores(sortedStores);
      setStores(sortedStores);
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

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        <Store sx={{ mr: 1, verticalAlign: 'middle' }} />
        Store Analysis
      </Typography>
      
      <Typography variant="subtitle1" color="text.secondary" paragraph>
        Most frequently visited stores based on your shopping history
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

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <TrendingUp sx={{ mr: 1, verticalAlign: 'middle' }} />
            Summary
          </Typography>
          <Box display="flex" gap={2} flexWrap="wrap">
            <Chip 
              label={`${stores.length} stores visited`} 
              color="primary" 
              icon={<Store />}
            />
            <Chip 
              label={`${stores.reduce((sum, store) => sum + store.visitCount, 0)} total visits`} 
              color="secondary"
            />
            <Chip 
              label={`${formatPrice(stores.reduce((sum, store) => sum + store.totalSpent, 0))} total spent`} 
              color="default"
            />
          </Box>
        </CardContent>
      </Card>

      <List>
        {stores.map((store, index) => (
          <Box key={store.storeName}>
            <ListItemButton
              onClick={() => router.push(`/stores/${encodeURIComponent(store.storeName)}`)}
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
                      {store.storeName}
                    </Typography>
                    <Box display="flex" gap={1}>
                      <Chip 
                        label={`${store.visitCount} visits`} 
                        size="small" 
                        color="primary"
                      />
                      <Chip 
                        label={formatPrice(store.totalSpent)} 
                        size="small" 
                        color="secondary"
                      />
                    </Box>
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Average per visit: {formatPrice(store.averageSpent)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Last visit: {formatDate(store.lastVisit)}
                    </Typography>
                  </Box>
                }
              />
            </ListItemButton>
            {index < stores.length - 1 && <Divider />}
          </Box>
        ))}
      </List>

      {stores.length === 0 && (
        <Alert severity="info">
          <Typography>
            {allStores.length === 0 
              ? 'No store data found. Please ensure the XML file is accessible.'
              : 'No store visits found in the selected date range.'
            }
          </Typography>
        </Alert>
      )}
    </Box>
  );
}
