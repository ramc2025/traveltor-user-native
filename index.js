/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import {Provider} from 'react-redux';
import {store} from './app/redux/store';
import {AuthProvider} from './app/context/AuthContext';
import {setBackgroundHandler} from './app/notifications/BackgroundHandler';
import 'react-native-gesture-handler';
import notifee from '@notifee/react-native';
import {onBackgroundEventHandler} from './app/notifications/notificationBackgroundEventHandler';

setBackgroundHandler();
notifee.onBackgroundEvent(onBackgroundEventHandler);

const ReduxWrappedApp = () => (
  <Provider store={store}>
    <AuthProvider>
      <App />
    </AuthProvider>
  </Provider>
);

AppRegistry.registerComponent(appName, () => ReduxWrappedApp);
