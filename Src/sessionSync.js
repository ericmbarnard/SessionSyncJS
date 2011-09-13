// SessionSyncJS Javascript Library v.09
// (c) Eric M Barnard - (http://www.ericbarnard.com)
// License: MIT (http://www.opensource.org/licenses/mit-license.php)

(function ($) {

    var ss = {};
    ss._version = '.09';

    var _lastActivityAt = new Date().getTime(),
        _sessionCreatedAt = new Date().getTime(),
        _lastActivityIntervalID = '',
        _checkSessionTimeIntervalID = '',
        _countdownIntervalID = '',
        _inFinalCountdown = false,
        _finalCountDownSecs = 1000,
        _settings = {},
        _coreEvents = {
            'sessionTimeOut': '__ss_SessionTimeOutEvent__',
            'serverSessionRefreshed': '__ss_RefreshServerSession__',
            'countdownStart': '__ss_CountdownStart__',
            'timeOutCountdown': '__ss_TimeOutCountdown__',
            'senseUserActivity': '__ss_SenseUserActivity__'
        }

    //==================== Session Refreshing ====================//

    // pass either true or false to this handler
    var refreshServerSessionCallback = function (success) {
        if (success) {
            var time = new Date().getTime();
            _lastActivityAt = _sessionCreatedAt = time;

            ss.events.raiseEvent(_coreEvents.serverSessionRefreshed, time);
        }
    };

    //Call the user-defined session refresh method and give it our method to callback    
    var refreshServerSession = function () {
        if (_lastActivityAt > _sessionCreatedAt) {
            _settings.refreshSessionRequest(refreshServerSessionCallback);
        }
    };

    //==================== Session TimeOut Methods ====================//

    var beginTimeOutCountdown = function () {
        //stop the current check
        _inFinalCountdown = true;

        window.clearInterval(_checkSessionTimeIntervalID);

        _finalCountDownSecs = _settings.timeOutCountdown / 1000; //millisecs divided by 1000

        //every second for 2 mins fire the countdown handlers
        _countdownIntervalID = window.setInterval(onCountDown, 1000); //1 sec

        //raise the event and tell our subscribers
        ss.events.raiseEvent(_coreEvents.countdownStart);
    };

    var killSession = function () {

        //clear the interval timers
        window.clearInterval(_countdownIntervalID);
        window.clearInterval(_lastActivityIntervalID);

        if (_checkSessionTimeIntervalID) {
            window.clearInterval(_checkSessionTimeIntervalID);
        }

        _finalCountDownSecs = 0;

        ss.events.raiseEvent(_coreEvents.sessionTimeOut);
    };

    var cancelCountDown = function () {
        _inFinalCountdown = false;

        //make sure we aren't duplicating any interval timers
        window.clearInterval(_countdownIntervalID);
        window.clearInterval(_lastActivityIntervalID);

        //slap the server
        refreshServerSession();

        //Start it back up again!
        ss.start();
    };

    //==================== Event Callers ====================//
    var onCountDown = function () {
        _finalCountDownSecs = _finalCountDownSecs - 1;

        if (_finalCountDownSecs < 1) {
            killSession();
        }

        //fire the countdown event handlers                    
        ss.events.raiseEvent(_coreEvents.timeOutCountdown, _finalCountDownSecs);
    };

    var onUserActivity = function () {
        _lastActivityAt = new Date().getTime();

        if (_inFinalCountdown) {
            cancelCountDown();
        }

        ss.events.raiseEvent(_coreEvents.senseUserActivity, _lastActivityAt);
    };

    //==================== Interval Handlers ====================//

    var checkSessionTime = function () {
        if (_lastActivityAt > _sessionCreatedAt) {
            refreshServerSession();
        } else {
            beginTimeOutCountdown();
        }
    };

    var checkForUserActivity = function () {
        if (_lastActivityAt > _sessionCreatedAt) {
            //jQuery.one is awesome for this!
            $(document).one("mousemove", function () {
                onUserActivity();
            });
        }
    };

    //============ Event Pub/Sub =================//
    // thanks AmplifyJS!!
    ss.events = (function () {

        var slice = [].slice,
	    subscriptions = {};

        return {
            raiseEvent: function (topic) {
                var args = slice.call(arguments, 1),
			    subscription,
			    length,
			    i = 0,
			    ret;

                if (!subscriptions[topic]) {
                    return true;
                }

                for (length = subscriptions[topic].length; i < length; i++) {
                    subscription = subscriptions[topic][i];
                    ret = subscription.callback.apply(subscription.context, args);
                    if (ret === false) {
                        break;
                    }
                }
                return ret !== false;
            },

            addEventHandler: function (topic, context, callback, priority) {
                if (arguments.length === 3 && typeof callback === "number") {
                    priority = callback;
                    callback = context;
                    context = null;
                }
                if (arguments.length === 2) {
                    callback = context;
                    context = null;
                }
                priority = priority || 10;

                var topicIndex = 0,
			    topics = topic.split(/\s/),
			    topicLength = topics.length;
                for (; topicIndex < topicLength; topicIndex++) {
                    topic = topics[topicIndex];
                    if (!subscriptions[topic]) {
                        subscriptions[topic] = [];
                    }

                    var i = subscriptions[topic].length - 1,
				    subscriptionInfo = {
				        callback: callback,
				        context: context,
				        priority: priority
				    };

                    for (; i >= 0; i--) {
                        if (subscriptions[topic][i].priority <= priority) {
                            subscriptions[topic].splice(i + 1, 0, subscriptionInfo);
                            return callback;
                        }
                    }

                    subscriptions[topic].unshift(subscriptionInfo);
                }

                return callback;
            }
        };
    })();

    var createEventSubscriberFunc = function (eventName) {
        //create closure
        return function (handler) {
            ss.events.addEventHandler(eventName, handler);
        };
    };

    //============ Object Setup =================//
    for (var eventProp in _coreEvents) {

        if (_coreEvents.hasOwnProperty(eventProp)) {
            // setup the event subscriber closure
            ss[eventProp] = createEventSubscriberFunc(_coreEvents[eventProp]);
        }
    }

    ss.start = function (config) {
        var defaults = {
            timeOutCountdown: 120000, //2 mins
            serverSessionLifetime: 2000000, //20 mins
            checkforActivityInterval: 30000, //30 secs
            refreshSessionRequest: function (callback) { callback(true); }
        };

        _settings = $.extend(defaults, config);

        //setup the initial userActivity checks
        var time = new Date().getTime();
        _lastActivityAt = _sessionCreatedAt = time;

        $(document).one("mousemove", function () {
            onUserActivity();
        });

        //Check for User Activity every XX seconds
        _lastActivityIntervalID = window.setInterval(checkForUserActivity, _settings.checkforActivityInterval);

        //Check if we need to TimeOut Session in XX -2 minutes
        var intervalTime = _settings.serverSessionLifetime - _settings.timeOutCountdown;
        _checkSessionTimeIntervalID = window.setInterval(checkSessionTime, intervalTime);

    };

    window.sessionSync = ss;
})(jQuery, undefined);