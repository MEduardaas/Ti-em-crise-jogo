import {
  Activity, ChartColumn, CircleCheck, CircleDashed, CircleHelp, CircleX, Code, Compass, Database, FireExtinguisher,
  Globe, Headset, Hourglass, KeyRound, Mail, Megaphone, Radar, Search, Server, ServerCrash, Shield, ShieldAlert,
  ShoppingCart, TriangleAlert, Wrench, type LucideIcon,
} from 'lucide-react'

// Os nomes de ícone ficam no banco (coluna `icone`); aqui mapeamos para o componente.
const ICONS: Record<string, LucideIcon> = {
  Activity, ChartColumn, CircleCheck, CircleDashed, CircleX, Code, Compass, Database, FireExtinguisher, Globe,
  Headset, Hourglass, KeyRound, Mail, Megaphone, Radar, Search, Server, ServerCrash, Shield, ShieldAlert,
  ShoppingCart, TriangleAlert, Wrench,
}

export function iconFor(name: string): LucideIcon {
  return ICONS[name] ?? CircleHelp
}
