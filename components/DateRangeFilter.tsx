'use client';

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Stack,
  Chip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { CalendarToday, Clear } from '@mui/icons-material';
import { enGB } from 'date-fns/locale';

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface DateRangeFilterProps {
  dateRange: DateRange;
  onDateRangeChange: (dateRange: DateRange) => void;
  onClear: () => void;
  title?: string;
  showClearButton?: boolean;
}

export default function DateRangeFilter({
  dateRange,
  onDateRangeChange,
  onClear,
  title = "Filter by Date Range",
  showClearButton = true
}: DateRangeFilterProps) {
  const handleStartDateChange = (date: Date | null) => {
    onDateRangeChange({
      ...dateRange,
      startDate: date
    });
  };

  const handleEndDateChange = (date: Date | null) => {
    onDateRangeChange({
      ...dateRange,
      endDate: date
    });
  };

  const isFilterActive = dateRange.startDate || dateRange.endDate;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enGB}>
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <CalendarToday sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">
              {title}
            </Typography>
            {isFilterActive && (
              <Chip
                label="Filter Active"
                color="primary"
                size="small"
                sx={{ ml: 2 }}
              />
            )}
          </Box>
          
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <DatePicker
              label="Start Date"
              value={dateRange.startDate}
              onChange={handleStartDateChange}
              format="yyyy-MM-dd"
              slotProps={{
                textField: {
                  size: 'small',
                  fullWidth: true,
                  placeholder: 'YYYY-MM-DD'
                }
              }}
            />
            
            <Typography variant="body2" color="text.secondary">
              to
            </Typography>
            
            <DatePicker
              label="End Date"
              value={dateRange.endDate}
              onChange={handleEndDateChange}
              format="yyyy-MM-dd"
              slotProps={{
                textField: {
                  size: 'small',
                  fullWidth: true,
                  placeholder: 'YYYY-MM-DD'
                }
              }}
            />
            
            {showClearButton && (
              <Button
                variant="outlined"
                startIcon={<Clear />}
                onClick={onClear}
                disabled={!isFilterActive}
                size="small"
              >
                Clear
              </Button>
            )}
          </Stack>
          
          {isFilterActive && (
            <Box mt={2}>
              <Typography variant="body2" color="text.secondary">
                Showing data from{' '}
                {dateRange.startDate ? dateRange.startDate.toLocaleDateString() : 'beginning'} to{' '}
                {dateRange.endDate ? dateRange.endDate.toLocaleDateString() : 'end'}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </LocalizationProvider>
  );
}
