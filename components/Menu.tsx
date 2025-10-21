'use client';
import { Settings, ViewList } from '@mui/icons-material';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import {
  AppBar,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography
} from '@mui/material';

import Link from 'next/link';
import React, { useState } from 'react';

export const Menu: React.FC<{}> = () => {
  const [drawer, setDrawer] = useState(false);

  return (
    <AppBar
      position="relative"
      sx={{ marginBottom: 2, boxShadow: 'none', padding: 1 }}
    >
      <Toolbar>
        <Drawer anchor="left" open={drawer} onClose={() => setDrawer(false)}>
          <DrawerList />
        </Drawer>
        <IconButton
          size="large"
          edge="start"
          color="inherit"
          aria-label="menu"
          onClick={() => setDrawer(true)}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          <Link href="/" style={{ textDecoration: 'none' }} passHref>
            <h1>Dagligvaror</h1>
          </Link>
        </Typography>
        <ToolbarList />
      </Toolbar>
    </AppBar>
  );
};

const ToolbarList: React.FC<{}> = () => {
  return <></>;
};

const DrawerList: React.FC<{}> = () => {
  return (
    <List>
      <Link href="/overview" passHref>
        <ListItemButton key={'Översikt'}>
          <ListItemIcon>
            <ViewList />
          </ListItemIcon>
          <ListItemText primary={'Översikt'} />
        </ListItemButton>
      </Link>

      <Link href="/settings" passHref>
        <ListItemButton key={'Inställningar'}>
          <ListItemIcon>
            <Settings />
          </ListItemIcon>
          <ListItemText primary={'Inställningar'} />
        </ListItemButton>
      </Link>

      <Divider />

      <Link href="/api/auth/logout" passHref>
        <ListItemButton key={'Logga ut'}>
          <ListItemIcon>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary={'Logga ut'} />
        </ListItemButton>
      </Link>
      <Link href="/login" passHref>
        <ListItemButton key={'Logga in'}>
          <ListItemIcon>
            <LoginIcon />
          </ListItemIcon>
          <ListItemText primary={'Logga in'} />
        </ListItemButton>
      </Link>
    </List>
  );
};
