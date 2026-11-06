import { AuthUser, TrustLevel, UserRole, UserType } from '@/types'

const TRUST_LEVELS: TrustLevel[] = ['LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4']
const USER_ROLES: UserRole[] = ['USER', 'CLIENT', 'VENDOR', 'ADMIN']
const USER_TYPES: UserType[] = ['STUDENT', 'LOCAL_PERSON', 'STAFF_FACULTY']

const normalizeTrustLevel = (value: unknown): TrustLevel | number => {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 4) {
    return value
  }
  if (typeof value === 'string' && TRUST_LEVELS.includes(value as TrustLevel)) {
    return value as TrustLevel
  }
  return 'LEVEL_1'
}

const normalizeRole = (value: unknown): UserRole =>
  typeof value === 'string' && USER_ROLES.includes(value as UserRole)
    ? value as UserRole
    : 'CLIENT'

const normalizeUserType = (value: unknown): UserType =>
  typeof value === 'string' && USER_TYPES.includes(value as UserType)
    ? value as UserType
    : 'STUDENT'

export function normalizeAuthUser(
  uid: string,
  profile: Record<string, unknown>,
): AuthUser {
  return {
    uid,
    id: uid,
    name: typeof profile.name === 'string' ? profile.name : 'User',
    email: typeof profile.email === 'string' ? profile.email : '',
    phone: typeof profile.phone === 'string' ? profile.phone : undefined,
    userType: normalizeUserType(profile.userType),
    profilePhoto: typeof profile.profilePhoto === 'string' ? profile.profilePhoto : undefined,
    trustLevel: normalizeTrustLevel(profile.trustLevel),
    role: normalizeRole(profile.role),
    rating: typeof profile.rating === 'number' ? profile.rating : 0,
    ratingCount: typeof profile.ratingCount === 'number' ? profile.ratingCount : 0,
    completedOrders: typeof profile.completedOrders === 'number' ? profile.completedOrders : 0,
    strikeCount: typeof profile.strikeCount === 'number' ? profile.strikeCount : 0,
    isVerified: profile.isVerified === true,
    isAdmin: profile.isAdmin === true || profile.role === 'ADMIN',
    isBanned: profile.isBanned === true,
    isSuspended: profile.isSuspended === true,
    riderModeSuspendedUntil: typeof profile.riderModeSuspendedUntil === 'string'
      ? profile.riderModeSuspendedUntil
      : undefined,
    isRiderModePermanentlyBanned: profile.isRiderModePermanentlyBanned === true,
    collegeName: typeof profile.collegeName === 'string' ? profile.collegeName : undefined,
    yearOfStudy: typeof profile.yearOfStudy === 'string' ? profile.yearOfStudy : undefined,
    branch: typeof profile.branch === 'string' ? profile.branch : undefined,
    address: typeof profile.address === 'string' ? profile.address : undefined,
    occupation: typeof profile.occupation === 'string' ? profile.occupation : undefined,
    designation: typeof profile.designation === 'string' ? profile.designation : undefined,
    department: typeof profile.department === 'string' ? profile.department : undefined,
    createdAt: typeof profile.createdAt === 'string' ? profile.createdAt : undefined,
  }
}
