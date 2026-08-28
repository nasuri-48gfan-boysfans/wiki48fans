import type { UserRole } from '../types/auth'

export type Permission = 'profile:read' | 'wiki:contribute' | 'moderation:manage' | 'admin:manage' | 'system:manage'
const rolePermissions: Record<UserRole, Permission[]> = { user: ['profile:read'], contributor: ['profile:read', 'wiki:contribute'], moderator: ['profile:read', 'wiki:contribute', 'moderation:manage'], admin: ['profile:read', 'wiki:contribute', 'moderation:manage', 'admin:manage'], super_admin: ['profile:read', 'wiki:contribute', 'moderation:manage', 'admin:manage', 'system:manage'] }
export function can(role: UserRole, permission: Permission) { return rolePermissions[role].includes(permission) }
