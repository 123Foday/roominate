import { Box } from 'lucide-react'
import React from 'react'
import Button from './ui/Button';
import { useOutletContext } from 'react-router';

/**
 * Navigation bar component with authentication controls.
 * @returns {JSX.Element} Navbar with branding, navigation links, and auth buttons.
 */
const Navbar = () => {
  const { isSignedIn, userName, signIn, signOut } = useOutletContext<AuthContext>()

  /**
   * Handles authentication button click to sign in or sign out.
   */
  const handleAuthClick = async () => {
    if(isSignedIn) {
      try {
        await signOut();
      } catch (e) {
        console.error(`Puter sign out failed: ${e}`);
      }
    }

    try {
      await signIn();
    } catch (e) {
      console.error(`Puter sign in failed: ${e}`);
    }
  };

  return (
    <header className='navbar'>
      <nav className='inner'>
        <div className='left'>
          <div className='brand'>
            <Box className='logo' />

            <span className='name'>
              Roominate
            </span>
          </div>

          <ul className='links'>
            <a href='#'>Products</a>
            <a href='#'>Pricing</a>
            <a href='#'>Community</a>
            <a href='#'>Enterprise</a>
          </ul>
        </div>

        <div className='actions'>
          {isSignedIn ? (
            <>
              <span className='greeting'>
                {userName ? `Hi, ${userName}` : 'Sign in'}
              </span>

              <Button size='sm' onClick={handleAuthClick} className='btn'>
                Log Out
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={handleAuthClick}
                size='sm' variant='ghost'>
                  Log In
              </Button>
              <a href="#upload"
                className='cta'>Get Started</a>
            </>
          )}

        </div>
      </nav>
    </header>
  )
}

export default Navbar
