import SockJS from 'sockjs-client';

import Stomp from 'webstomp-client';
import { Observable } from 'rxjs';

import { ACTION_TYPES as ADMIN_ACTIONS } from 'app/modules/administration/administration.reducer';
import { ACTION_TYPES as AUTH_ACTIONS } from 'app/shared/reducers/authentication';
import { SUCCESS, FAILURE } from 'app/shared/reducers/action-type.util';
import cookie from 'app/shared/util/cookie-utils';

let stompClient = null;

let subscriber = null;
let connection: Promise<any>;
let connectedPromise: any = null;
let listener: Observable<any>;
let listenerObserver: any;
let alreadyConnectedOnce = false;

const createConnection = (): Promise<any> => new Promise((resolve, reject) => (connectedPromise = resolve));

const createListener = (): Observable<any> =>
  new Observable(observer => {
    listenerObserver = observer;
  });

const sendActivity = () => {
  connection.then(() => {
    stompClient.send(
      '/topic/activity', // destination
      JSON.stringify({ page: window.location.hash }), // body
      {} // header
    );
  });
};

const subscribe = () => {
  connection.then(() => {
    subscriber = stompClient.subscribe('/topic/tracker', data => {
      listenerObserver.next(JSON.parse(data.body));
    });
  });
};

const connect = () => {
  if (connectedPromise !== null || alreadyConnectedOnce) {
    // the connection is already being established
    return;
  }
  connection = createConnection();
  listener = createListener();

  // building absolute path so that websocket doesn't fail when deploying with a context path
  const loc = window.location;
  const baseHref = document.querySelector('base').getAttribute('href').replace(/\/$/, '');

  const headers = {};
  const url = '//' + loc.host + baseHref + '/websocket/tracker';
  headers['X-XSRF-TOKEN'] = cookie.read('XSRF-TOKEN');
  const socket = new SockJS(url);
  stompClient = Stomp.over(socket);

  stompClient.connect(headers, () => {
    connectedPromise('success');
    connectedPromise = null;
    subscribe();
    sendActivity();
    if (!alreadyConnectedOnce) {
      window.onhashchange = () => {
        sendActivity();
      };
      alreadyConnectedOnce = true;
    }
  });
};

const disconnect = () => {
  if (stompClient !== null) {
    stompClient.disconnect();
    stompClient = null;
  }
  window.onhashchange = () => {};
  alreadyConnectedOnce = false;
};

const receive = () => listener;

const unsubscribe = () => {
  if (subscriber !== null) {
    subscriber.unsubscribe();
  }
  listener = createListener();
};

export default store => next => action => {
  if (action.type === SUCCESS(AUTH_ACTIONS.GET_SESSION)) {
    connect();
    if (!alreadyConnectedOnce) {
      receive().subscribe(activity => {
        return store.dispatch({
          type: ADMIN_ACTIONS.WEBSOCKET_ACTIVITY_MESSAGE,
          payload: activity,
        });
      });
    }
  } else if (action.type === FAILURE(AUTH_ACTIONS.GET_SESSION)) {
    unsubscribe();
    disconnect();
  }
  return next(action);
};
