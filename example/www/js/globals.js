angular.module('imagetoolsApp.globals', [])

// TODO: For production change the useDefaultLogin setting to false
//   and change the runLocal setting to false.

.service('AppSettings', function () {
    var appSettings = {
        appVersion: '0.0.1'
    };
    return appSettings;
})

.service('AppState', function () {
    var appState = {
    };
    return appState;
})
