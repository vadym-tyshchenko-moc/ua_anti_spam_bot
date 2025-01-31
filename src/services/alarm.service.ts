import { EventEmitter } from 'node:events';
import EventSource from 'eventsource';
import ms from 'ms';
import type TypedEmitter from 'typed-emitter';

import { environmentConfig } from '../config';
import type { AlarmNotification, AlarmStates } from '../types/alarm';

import { getAlarmMock } from './_mocks';

const apiUrl = 'https://alerts.com.ua/api/states';
const apiOptions = { headers: { 'X-API-Key': environmentConfig.ALARM_KEY } };

export const ALARM_CONNECT_KEY = 'connect';
export const ALARM_CLOSE_KEY = 'close';
export const ALARM_EVENT_KEY = 'update';
export const TEST_ALARM_STATE = 'Московська область';

export interface UpdatesEvents {
  connect: (reason: string) => void;
  close: (reason: string) => void;
  update: (body: AlarmNotification) => void;
}

/**
 * @description Service for handling Alarm API
 * @deprecated
 * */
export class AlarmService {
  // TODO replace with event target
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  // eslint-disable-next-line unicorn/prefer-event-target
  updatesEmitter = new EventEmitter() as TypedEmitter<UpdatesEvents>;

  source?: EventSource;

  reconnectInterval?: NodeJS.Timer;

  testAlarmInterval?: NodeJS.Timer;

  getStates(): Promise<AlarmStates> {
    // TODO replace this API with the new one
    return Promise.resolve({
      states: [],
      last_update: new Date().toISOString(),
    });
    // return (
    //   axios
    //     .get<AlarmStates>(apiUrl, apiOptions)
    //     .then((response) => response.data)
    //     // eslint-disable-next-line @typescript-eslint/no-explicit-any
    //     .catch((error: Record<any, any>) => {
    //       console.info(`Alarm API is not responding:  ${JSON.stringify(error)}`);
    //       return {
    //         states: [],
    //         last_update: new Date().toISOString(),
    //       };
    //     })
    // );
  }

  /**
   * Restarts the connection
   * */
  restart() {
    // It will automatically disconnect and reconnect again.
    // We don't need to call extra disable
    this.enable('restart');
  }

  /**
   * Starts the connection
   * */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  enable(reason: string) {
    // TODO replace this API with the new one
    // this.subscribeOnNotifications(reason);
    // this.initTestAlarms();
    //
    // if (environmentConfig.ENV === 'production') {
    //   this.reconnectInterval = setInterval(() => {
    //     this.subscribeOnNotifications('reconnect');
    //   }, ms('1d'));
    // }
  }

  /**
   * Closes the connection
   * */
  disable(reason: string) {
    if (this.source) {
      this.source.close();
      this.updatesEmitter.emit(ALARM_CLOSE_KEY, reason);
    }

    if (this.reconnectInterval) {
      // clearInterval(this.reconnectInterval);
    }

    if (this.testAlarmInterval) {
      // clearInterval(this.testAlarmInterval);
    }
  }

  /**
   * Creates SSE subscription to Alarm API events
   * */
  subscribeOnNotifications(reason: string) {
    if (environmentConfig.DISABLE_ALARM_API) {
      return;
    }

    this.disable(reason);
    let isConnected = false;
    this.source = new EventSource(`${apiUrl}/live`, apiOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.source.addEventListener('error', (event: MessageEvent & Record<string, any>) => {
      console.info(`Subscribe to Alarm API fail:  ${event.message as string}`);
    });

    this.source.addEventListener('open', () => {
      console.info('Opening a connection to Alarm API ...');
    });

    this.source.addEventListener('hello', () => {
      console.info('Connection to Alarm API opened successfully.');

      // Hello pings every 1h
      if (!isConnected) {
        this.updatesEmitter.emit(ALARM_CONNECT_KEY, reason);
        isConnected = true;
      }
    });

    this.source.addEventListener('update', (event: MessageEvent<string>) => {
      /**
       * SSE endpoint response
       * @see https://alerts.com.ua/en
       * */
      const data = JSON.parse(event.data) as AlarmNotification | null;
      if (data) {
        this.updatesEmitter.emit(ALARM_EVENT_KEY, data);
      }
    });
  }

  initTestAlarms() {
    let alert = true;
    this.testAlarmInterval = setInterval(() => {
      this.updatesEmitter.emit(ALARM_EVENT_KEY, getAlarmMock(alert, TEST_ALARM_STATE));
      alert = !alert;
    }, ms('0.5m'));
  }
}

export const alarmService = new AlarmService();
