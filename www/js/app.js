// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js
angular.module('starter', ['ionic', 'starter.controllers', 'starter.services', 'ionic.utils'])

.run(function($ionicPlatform, $localstorage, $state) {

  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }

     if( !$localstorage.get('client') ){
      //console.log("NOK");
      $state.go('installation');

    } else {
      //console.log("OK");
    }

  });

})


.config(function($stateProvider, $urlRouterProvider) {

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider

  .state('installation', {
    url: '/install',
    views: {
      'installation': {
        templateUrl: 'templates/installation.html',
        controller: 'installCtrl'
      }
    }
  })

  // setup an abstract state for the tabs directive
  .state('tab', {
    url: "/tab",
    abstract: true,
    templateUrl: "templates/tabs.html"
  })

  // Each tab has its own nav history stack:


  .state('tab.etat', {
    url: '/etat',
    views: {
      'tab-etat': {
        templateUrl: 'templates/tab-etat.html',
        controller: 'etatCtrl'
      }
    }
  })

  .state('tab.historique', {
    url: '/historique',
    views: {
      'tab-historique': {
        templateUrl: 'templates/tab-historique.html',
        controller: 'HistoriqueCtrl',
        cache: false
      }
    }
  })
  .state('tab.images', {
    url: '/images',
    views: {
      'tab-images': {
        templateUrl: 'templates/tab-images.html',
        controller: 'ImagesCtrl',
        cache: false
      }
    }
  })
  /*
  .state('tab.chat-detail', {
    url: '/chats/:chatId',
    views: {
      'tab-chats': {
        templateUrl: 'templates/chat-detail.html',
        controller: 'ChatDetailCtrl'
      }
    }
  })
*/
  .state('tab.configuration', {
    url: '/configuration',
    views: {
      'tab-configuration': {
        templateUrl: 'templates/tab-configuration.html',
        controller: 'ConfigurationCtrl'
      }
    }
  });

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/install');

});
