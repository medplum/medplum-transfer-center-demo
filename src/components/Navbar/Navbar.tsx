import { Code, Group } from '@mantine/core';
import { IconAmbulance, IconDashboard, IconLogout, IconStethoscope } from '@tabler/icons-react';
import { Link, useLocation } from 'react-router-dom';

import { Text } from '@mantine/core';
import classes from './Navbar.module.css';

const menu = [
  { link: '/dashboard', label: 'Dashboard', icon: IconDashboard },
  { link: '/transfers', label: 'Transfer Center', icon: IconAmbulance },
  // { link: '/laboratory', label: 'Laboratory', icon: IconMicroscope },
  // { link: '/radiology', label: 'Radiology', icon: IconRadioactive },
  // { link: '/notifications', label: 'Notifications', icon: IconBellRinging },
];

const adminMenu = [
  { link: '/physicians', label: 'Physicians', icon: IconStethoscope },
  // { link: '/locations', label: 'Locations', icon: IconHospital },
  // { link: '/units', label: 'Units', icon: IconBuildingHospital },
  // { link: '/settings', label: 'Settings', icon: IconSettings },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const activeItem =
    menu.find((item) => pathname.startsWith(item.link)) || adminMenu.find((item) => pathname.startsWith(item.link));

  const links = menu.map((item) => (
    <Link
      className={classes.link}
      data-active={item.link === activeItem?.link || undefined}
      to={item.link}
      key={item.label}
    >
      <item.icon className={classes.linkIcon} stroke={1.5} />
      <span>{item.label}</span>
    </Link>
  ));

  const adminLinks = adminMenu.map((item) => (
    <Link
      className={classes.link}
      data-active={item.link === activeItem?.link || undefined}
      to={item.link}
      key={item.label}
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
