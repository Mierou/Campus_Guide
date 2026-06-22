import { isMobileDevice } from '@/lib/device'
import Desktop from './desktop'
import Mobile from './mobile'

export default async function Page() {
  const mobile = await isMobileDevice()
  return mobile ? <Mobile /> : <Desktop />
}
