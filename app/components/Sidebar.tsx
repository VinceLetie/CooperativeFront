'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './Sidebar.module.css'


const navLinks = [
  { label: 'Dashboard',    href: '/dashboard' },
  { label: 'Voitures',     href: '/voitures' },
  { label: 'Clients',      href: '/clients' },
  { label: 'Réservations', href: '/reservations' },
]

export default function Sidebar() {
  const pathname = usePathname()

  const isActive = (href: string) => pathname.startsWith(href)

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <div className={styles.logoTitle}>Coopérative Tsara</div>
        <div className={styles.logoSub}>GESTION RÉSERVATIONS</div>
      </div>

      <nav className={styles.nav}>
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={
              isActive(link.href)
                ? `${styles.navLink} ${styles.navLinkActive}`
                : styles.navLink
            }
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}