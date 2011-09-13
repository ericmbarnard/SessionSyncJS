#SessionSyncJS

SessionSyncJS is a Javascript library for managing your server-side session within client-centric javascript applications.

__Some of the common issues this library solves are:__

* Keeping a user's server session alive when they aren't making HTTP traffic, but still using your app
* Subscribing to different events around the changes that happen with the users session
* Not leaving expensive event handlers attached to your DOM just to see if the user is active or not

## Getting Started

```javascript
sessionSync.start({
    refreshSessionRequest: function(responseCallback){
        //use jQuery AJAX or your favorite AJAX call to
        //hit the server and keep the session alive
        responseCallback(true); //tell the callback true or false if it worked!
    }
});
```