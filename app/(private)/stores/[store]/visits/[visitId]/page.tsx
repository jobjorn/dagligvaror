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
  Grid,
  ListItemButton
} from '@mui/material';
import {
  ArrowBack,
  Store,
  ShoppingCart,
  CalendarToday,
  AttachMoney,
  LocalGroceryStore,
  Receipt
} from '@mui/icons-material';

interface VisitItem {
  description: string;
  quantity: number;
  price: number;
  totalPrice: number;
}

interface VisitDetails {
  transactionId: string;
  storeName: string;
  date: string;
  totalAmount: number;
  totalDiscount: number;
  vatAmount: number;
  paymentType: string;
  receiptType: string;
  items: VisitItem[];
}

export default function VisitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const storeName = decodeURIComponent(params.store as string);
  const visitId = params.visitId as string;
  
  const [visitDetails, setVisitDetails] = useState<VisitDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visitId && storeName) {
      analyzeVisitData(visitId, storeName);
    }
  }, [visitId, storeName]);

  const analyzeVisitData = async (transactionId: string, storeName: string) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch both receipt XML files to get visit details
      const receiptFiles = ['/Butik_kvitto.xml', '/Butik_kvitto_2.xml'];
      let visitData: any = null;

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
          
          // Find the specific transaction
          const receiptTransactions = receiptXmlDoc.querySelectorAll('transactions');
          for (const transaction of receiptTransactions) {
            const currentTransactionId = transaction.querySelector('transactionId')?.textContent || '';
            const currentStoreName = transaction.querySelector('marketingName')?.textContent || '';
            
            if (currentTransactionId === transactionId && currentStoreName === storeName) {
              visitData = {
                transactionId: currentTransactionId,
                storeName: currentStoreName,
                date: transaction.querySelector('transactionTimestamp')?.textContent || '',
                totalAmount: parseFloat(transaction.querySelector('transactionValue')?.textContent || '0'),
                totalDiscount: parseFloat(transaction.querySelector('totalDiscount')?.textContent || '0'),
                vatAmount: parseFloat(transaction.querySelector('vatAmount')?.textContent || '0'),
                paymentType: transaction.querySelector('paymentType')?.textContent || 'Unknown',
                receiptType: transaction.querySelector('receiptType')?.textContent || 'Unknown',
              };
              break;
            }
          }
          if (visitData) break;
        } catch (fileError) {
          console.warn(`Error processing ${receiptFile}:`, fileError);
        }
      }

      if (!visitData) {
        throw new Error('Visit not found');
      }

      // Fetch grocery data to get items for this visit
      const groceryFiles = ['/Butik_kvittorader.xml', '/Butik_kvittorader_2.xml'];
      const items: VisitItem[] = [];

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
            const currentTransactionId = transaction.querySelector('transactionId')?.textContent || '';
            const quantity = parseFloat(transaction.querySelector('quantity')?.textContent || '0');
            const price = parseFloat(transaction.querySelector('price')?.textContent || '0');
            const description = transaction.querySelector('itemDesc')?.textContent || 'Unknown Item';

            if (currentTransactionId === transactionId && quantity > 0 && price > 0) {
              items.push({
                description: description.trim() || 'Unknown Item',
                quantity,
                price,
                totalPrice: price
              });
            }
          });
        } catch (fileError) {
          console.warn(`Error processing ${groceryFile}:`, fileError);
        }
      }

      // Sort items by total price (highest first)
      items.sort((a, b) => b.totalPrice - a.totalPrice);

      const visitDetails: VisitDetails = {
        ...visitData,
        items
      };

      setVisitDetails(visitDetails);
    } catch (err) {
      console.error('Error analyzing visit data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while analyzing the data');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => `${price.toFixed(2)} SEK`;
  const formatDate = (date: string) => new Date(date).toLocaleDateString();
  const formatDateTime = (date: string) => new Date(date).toLocaleString();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading visit details...
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

  if (!visitDetails) {
    return (
      <Box p={3}>
        <Alert severity="warning">
          <Typography>Visit not found or no data available.</Typography>
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
          <Receipt sx={{ mr: 1, verticalAlign: 'middle' }} />
          Visit Details
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Visit Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Store sx={{ mr: 1, verticalAlign: 'middle' }} />
                Visit Information
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <Store />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Store" 
                    secondary={visitDetails.storeName} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CalendarToday />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Date & Time" 
                    secondary={formatDateTime(visitDetails.date)} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <AttachMoney />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Total Amount" 
                    secondary={formatPrice(visitDetails.totalAmount)} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <ShoppingCart />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Payment Type" 
                    secondary={visitDetails.paymentType} 
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Transaction Details */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Receipt sx={{ mr: 1, verticalAlign: 'middle' }} />
                Transaction Details
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <Box display="flex" justifyContent="space-between">
                  <Typography>Transaction ID:</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {visitDetails.transactionId}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography>Receipt Type:</Typography>
                  <Chip label={visitDetails.receiptType} size="small" color="primary" />
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography>Discount:</Typography>
                  <Chip 
                    label={formatPrice(Math.abs(visitDetails.totalDiscount))} 
                    size="small" 
                    color={visitDetails.totalDiscount < 0 ? "success" : "default"}
                  />
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography>VAT Amount:</Typography>
                  <Chip label={formatPrice(visitDetails.vatAmount)} size="small" color="secondary" />
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography>Items Count:</Typography>
                  <Chip label={visitDetails.items.length.toString()} size="small" color="default" />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Items Purchased */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <LocalGroceryStore sx={{ mr: 1, verticalAlign: 'middle' }} />
                Items Purchased
              </Typography>
              {visitDetails.items.length > 0 ? (
                <List>
                  {visitDetails.items.map((item, index) => (
                    <Box key={`${item.description}-${index}`}>
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
                                  label={`${item.quantity.toFixed(1)} units`} 
                                  size="small" 
                                  color="primary"
                                />
                                <Chip 
                                  label={`${formatPrice(item.price)} per unit`} 
                                  size="small" 
                                  color="secondary"
                                />
                                <Chip 
                                  label={formatPrice(item.totalPrice)} 
                                  size="small" 
                                  color="default"
                                />
                              </Box>
                            </Box>
                          }
                          secondary={
                            <Typography variant="body2" color="text.secondary">
                              Total: {formatPrice(item.totalPrice)}
                            </Typography>
                          }
                        />
                      </ListItemButton>
                      {index < visitDetails.items.length - 1 && <Divider />}
                    </Box>
                  ))}
                </List>
              ) : (
                <Alert severity="info">
                  <Typography>No items found for this visit.</Typography>
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
