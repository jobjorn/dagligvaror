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
  ListItemButton
} from '@mui/material';
import { ShoppingCart, TrendingUp, LocalGroceryStore } from '@mui/icons-material';

interface GroceryItem {
  description: string;
  totalQuantity: number;
  totalPrice: number;
  averagePrice: number;
  purchaseCount: number;
}

export default function GroceryAnalysisPage() {
  const router = useRouter();
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    analyzeGroceryData();
  }, []);

  const analyzeGroceryData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch both XML files
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

            if (quantity > 0 && price > 0) {
              const key = description.trim() || 'Unknown Item';
              
              if (itemMap.has(key)) {
                const existing = itemMap.get(key)!;
                existing.totalQuantity += quantity;
                existing.totalPrice += price;
                existing.purchaseCount += 1;
                existing.averagePrice = existing.totalPrice / existing.totalQuantity;
              } else {
                itemMap.set(key, {
                  description: key,
                  totalQuantity: quantity,
                  totalPrice: price,
                  averagePrice: price,
                  purchaseCount: 1
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
          </Box>
        </CardContent>
      </Card>

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
                    </Typography>
                  </Box>
                }
              />
            </ListItemButton>
            {index < items.length - 1 && <Divider />}
          </Box>
        ))}
      </List>

      {items.length === 0 && (
        <Alert severity="info">
          <Typography>No grocery data found. Please ensure the XML file is accessible.</Typography>
        </Alert>
      )}
    </Box>
  );
}
