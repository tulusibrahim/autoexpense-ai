import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import App from './App';
import { antdTheme } from './theme';
import 'antd/dist/reset.css';

// Configure dayjs
dayjs.locale('id');

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ConfigProvider theme={antdTheme}>
      <App />
    </ConfigProvider>
  </React.StrictMode>
);