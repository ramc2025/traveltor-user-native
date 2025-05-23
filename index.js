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
import {initBackgroundTask} from './app/utils/BackgroundTaskService';
import 'react-native-gesture-handler';
// import {syncDrafts} from './app/utils/draftManager';

setBackgroundHandler();

const ReduxWrappedApp = () => (
  <Provider store={store}>
    <AuthProvider>
      <App />
    </AuthProvider>
  </Provider>
);

AppRegistry.registerComponent(appName, () => ReduxWrappedApp);

initBackgroundTask().catch(error =>
  console.error('Failed to initialize background task:', error),
);

// AppRegistry.registerHeadlessTask('com.traveltor.sync', () => async () => {
//   try {
//     // Perform sync operation
//     await syncDrafts();
//     return Promise.resolve();
//   } catch (error) {
//     console.error('Error in background task:', error);
//     return Promise.reject(error);
//   }
// });
