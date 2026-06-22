import { isMobileDevice } from '@/lib/device'
import GuardDesktop from './desktop'
import GuardMobile from './mobile'

export default async function GuardPage() {
  const mobile = await isMobileDevice()
  return mobile ? <GuardMobile /> : <GuardDesktop />
}
