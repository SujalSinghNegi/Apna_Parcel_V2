import { cn, initials } from '@/lib/utils'
import Image from 'next/image'
interface AvatarProps { src?: string; name: string; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }
const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-lg' }
const px = { sm: 32, md: 40, lg: 48, xl: 64 }
export const Avatar = ({ src, name, size = 'md', className }: AvatarProps) => (
  <div className={cn('rounded-full overflow-hidden bg-gradient-to-br from-brand to-brand-600 flex items-center justify-center flex-shrink-0', sizes[size], className)}>
    {src ? <Image src={src} alt={name} width={px[size]} height={px[size]} className="w-full h-full object-cover" /> :
      <span className="font-display font-bold text-white">{initials(name)}</span>}
  </div>
)
