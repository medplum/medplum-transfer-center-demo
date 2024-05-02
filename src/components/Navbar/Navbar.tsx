import { useState } from 'react';
import { Group, Code } from '@mantine/core';
import { Link } from 'react-router-dom';
import {
  IconBellRinging,
  IconSettings,
  IconDashboard,
  IconLogout,
  IconAmbulance,
  IconBuildingHospital,
  IconHospital,
} from '@tabler/icons-react';

import { Text } from '@mantine/core';
import classes from './Navbar.module.css';

const menu = [
  { link: '/dashboard', label: 'Dashboard', icon: IconDashboard },
  { link: 'transfers', label: 'Transfer', icon: IconAmbulance },
  { link: 'units', label: 'Units', icon: IconBuildingHospital },
  { link: 'notifications', label: 'Notifications', icon: IconBellRinging },
  { link: 'settings', label: 'Settings', icon: IconSettings },
];

const adminMenu = [{ link: 'locations', label: 'Locations', icon: IconHospital }];

export default function Navbar() {
  const [active, setActive] = useState('Dashboard');

  const links = menu.map((item) => (
    <Link
      className={classes.link}
      data-active={item.label === active || undefined}
      to={item.link}
      key={item.label}
      onClick={() => {
        // event.preventDefault();
        setActive(item.label);
      }}
    >
      <item.icon className={classes.linkIcon} stroke={1.5} />
      <span>{item.label}</span>
    </Link>
  ));

  const adminLinks = adminMenu.map((item) => (
    <Link
      className={classes.link}
      data-active={item.label === active || undefined}
      to={item.link}
      key={item.label}
      onClick={() => {
        // event.preventDefault();
        setActive(item.label);
      }}
    >
      <item.icon className={classes.linkIcon} stroke={1.5} />
      <span>{item.label}</span>
    </Link>
  ));

  return (
    <nav className={classes.navbar}>
      <div className={classes.navbarMain}>
        <Group className={classes.header} justify="space-between">
          <Text>Transfer Center</Text>
          <Code fw={700}>v1.0.1</Code>
        </Group>
        {links}
      </div>
      <div className={classes.horizontalLine}></div>
      <div className={classes.navbarMain}>{adminLinks}</div>

      <div className={classes.footer}>
        <Link className={classes.link} to="/signout">
          <IconLogout className={classes.linkIcon} stroke={1.5} />
          <span>Logout</span>
        </Link>
      </div>
    </nav>
  );
}
