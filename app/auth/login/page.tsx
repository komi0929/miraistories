import { LoginForm } from './login-form'

// Force dynamic rendering to avoid build-time prerendering
export const dynamic = 'force-dynamic'

export default function LoginPage() {
    return <LoginForm />
}
