import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

let echoInstance = null;

/**
 * Inisialisasi dan dapatkan singleton instance Laravel Echo (Reverb).
 * Kredensial dibaca sepenuhnya secara dinamis dari process.env (bukan hardcoded).
 */
export const getEcho = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  if (echoInstance) {
    return echoInstance;
  }

  window.Pusher = Pusher;

  // Baca environment variables Reverb
  const reverbKey = process.env.NEXT_PUBLIC_REVERB_APP_KEY;
  const reverbHost = process.env.NEXT_PUBLIC_REVERB_HOST || window.location.hostname;
  const reverbPort = Number(process.env.NEXT_PUBLIC_REVERB_PORT) || 8080;
  const reverbScheme = process.env.NEXT_PUBLIC_REVERB_SCHEME || 'http';
  const forceTLS = reverbScheme === 'https';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

  echoInstance = new Echo({
    broadcaster: 'reverb',
    key: reverbKey,
    wsHost: reverbHost,
    wsPort: reverbPort,
    wssPort: reverbPort,
    forceTLS: forceTLS,
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${apiUrl}/broadcasting/auth`,
    auth: {
      headers: {
        Accept: 'application/json',
      },
    },
    authorizer: (channel) => {
      return {
        authorize: (socketId, callback) => {
          const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

          fetch(`${apiUrl}/broadcasting/auth`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': token ? `Bearer ${token}` : '',
            },
            body: JSON.stringify({
              socket_id: socketId,
              channel_name: channel.name,
            }),
          })
            .then((response) => {
              if (!response.ok) {
                throw new Error(`Broadcasting auth failed with status ${response.status}`);
              }
              return response.json();
            })
            .then((data) => {
              callback(null, data);
            })
            .catch((error) => {
              callback(error, null);
            });
        },
      };
    },
  });

  return echoInstance;
};

export default getEcho;
