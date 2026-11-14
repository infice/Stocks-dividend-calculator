import { Redirect } from 'expo-router';

// The root provider handles callback credentials before protected content mounts.
export default function AuthCallbackRoute() {
  return <Redirect href="/" />;
}
