angular.module('starter.controllers', [])

.controller('installCtrl', function($scope,  $http, $state, $localstorage){
    // ce controller permet de vérifier et d'enregistrer les infos au premier lancement
    if($localstorage.getObject("client").clientID){
        //console.log("client ds le storage trouvé : "+$localstorage.getObject("client"));
        $state.go('tab.etat');
    }

    $scope.verifierInfos = function(info){

        if( (info && info.clientID.length==8)  && (info.mdp && info.mdp.length>1) ){
            //console.log('ClientID : '+info.clientID+' MDP:'+md5(info.mdp));
            $http({
                method: 'POST',
                url: 'http://62.210.198.116:64803/service.php',
                data:  { clientID:info.clientID, mdp:md5(info.mdp) }
            }).
            success(function(data, status, headers, config) {
                console.log("Status : "+status+" Data : "+JSON.stringify(data) );
                $localstorage.setObject("client", data);

                info.clientID='';
                info.mdp='';
                $state.go('tab.etat');
            }).
error(function(data, status, headers, config) {
                // called asynchronously if an error occurs
                // or server returns response with an error status.
                console.log("Status : "+status+" Data : "+data);
            });
        }else{
            console.log('No infos...');
        }
    }
})

.controller('etatCtrl', function($scope, $http, $localstorage, $ionicLoading, $timeout, $ionicPopup, $interval, $state, $window) {

    // ce controller permet d'obtenir l'état de l'alarme et de le changer

    //console.log($localstorage.getObject("client"));
    var etats = [
        { "codeEtat" : "0", "txtEtat" : "ARRET" },
        { "codeEtat" : "1", "txtEtat" : "TOTALE"},
        { "codeEtat" : "2", "txtEtat" : "PARTIELLE"}
    ];

    var images  = [
        { "codeEtat" : "0", "imgEtat" : "btn-alarme-arret" },
        { "codeEtat" : "1", "imgEtat" : "btn-alarme-totale" },
        { "codeEtat" : "2", "imgEtat" : "btn-alarme-partielle" }
    ];

    var codeSMS = [
        { "codeEtat" : "0", "smsTXT" : "AP" },
        { "codeEtat" : "1", "smsTXT" : "TP"},
        { "codeEtat" : "2", "smsTXT" : "PP"}
    ];

    //$scope.etatCode = etats[0].codeEtat; // 0=arret,1=totale,2=partielle
    $scope.etatCode = etats[0].codeEtat;

    $http({
        method: 'POST',
        url: 'http://62.210.198.116:64803/service.php',
        data:  { clientID: $localstorage.getObject("client").clientID, cleService: $localstorage.getObject("client").cleService, type: 'etatAlarme'}
    }).
    success(function(data, status, headers, config) {
        $scope.etatCode = data;
        //console.log("Etat récupéré : "+data);
        $scope.etatTxt = etats[ $scope.etatCode  ].txtEtat;
        $scope.etatImg = images[ $scope.etatCode ].imgEtat;
    }).
    error(function(data, status, headers, config) {
        // called asynchronously if an error occurs
        // or server returns response with an error status.
        console.log("Status : "+status+" Data : "+data);
    });


    $scope.showPopupCode = function(etat) {
        $scope.data = {}
        var myPopup = $ionicPopup.show({
            template: '<input type="password" ng-model="data.code">',
            title: 'Entrer votre code utilisateur',
            subTitle: '(Code clavier de votre alarme)',
            scope: $scope,
            buttons: [
                { text: 'Annuler' },
                {
                    text: '<b>Envoyer</b>',
                    type: 'button-dark',
                    onTap: function(e) {
                        if (!$scope.data.code) {
                            //don't allow the user to close unless he enters wifi password
                            e.preventDefault();
                         } else {
                            // TODO : mettre en place un système de vérification si la centrale est connectée
                            // en IP ou en GSM en média principal
                            // Si c'est en GSM, on envoit un SMS
                            // SI c'est en IP, on n'envoit pas le SMS
                            var connectionGSM = ($localstorage.getObject("client").typeConnexion == "GSM");
                            if(connectionGSM){
                                //console.log("sending SMS");
                                sendSMS(etat, $scope.data.code);
                            } else {
                                //console.log("no SMS");
                                changeEtat(etat);
                            }

                        }
                   }
                }
            ]
        });
    }

    var demandePromise;
    var demandeEnCours = false;
    function isDemandeEnCours(){
        $http({
            method: 'POST',
            url: 'http://62.210.198.116:64803/service.php',
            data:  {    clientID: $localstorage.getObject("client").clientID,
                        cleService:$localstorage.getObject("client").cleService,
                        type: 'etatEnCours'
                    }
        }).
        success(function(data, status, headers, config) {
            if(data == "TRUE"){
                //console.log("Demande en cours : "+data);
                return true;
            }else{
                //console.log("Demande acquitée : "+data);
                $interval.cancel(demandePromise);
                $ionicLoading.hide();
                $window.location.reload(true);
                return false;
            }

        }).
        error(function(data, status, headers, config) {
        // called asynchronously if an error occurs
        // or server returns response with an error status.
            console.log("Status : "+status+" Data : "+data);
        });
    }

    function sendSMS(etat, code){
        var txtEtat = etats[ etat ].txtEtat;
        var numeroSim = $localstorage.getObject("client").numeroAppelSim;

        var smsMessage = code+" "+codeSMS[ etat ].smsTXT;

        var success = function(){
            //console.log("OK: SMS envoyé au format : "+smsMessage);
            changeEtat(etat);
        }

        var error = function(){
            console.log("ERREUR: SMS non envoyé au format : "+smsMessage);
        }

        if(numeroSim && numeroSim.match("^0[67]([-. ]?[0-9]{2}){4}$")){
            numeroSim = numeroSim.replace('.', '');
            numeroSim = numeroSim.replace(' ', '');
            numeroSim = numeroSim.trim();

            var options = {
                replaceLineBreaks: false, // true to replace \n by a new line, false by default
                android: {
                    intent: ''  // send SMS with the native android SMS messaging
                //intent: '' // send SMS without open any other app
                }
            };
            //console.log("OK: SMS envoyé au format : "+smsMessage);
            sms.send(numeroSim, smsMessage, options, success, error);
        }
    }

    function changeEtat(etat){

        var codeUtilisateur = $scope.data.code;
        // Lancer le SMS

        // Transmettre au webservice la demande de changement d'état
        $http({
            method: 'POST',
            url: 'http://62.210.198.116:64803/service.php',
            data:  {    clientID: $localstorage.getObject("client").clientID,
                        cleService:$localstorage.getObject("client").cleService,
                        type: 'changementEtat',
                        typeArg1: codeUtilisateur, typeArg2: etat
                    }
        }).
        success(function(data, status, headers, config) {

            demandePromise = $interval(isDemandeEnCours, 5000);
            /*
                $scope.etatCode = data;
                $scope.etatTxt = etats[ $scope.etatCode  ].txtEtat;
                $scope.etatImg = images[ $scope.etatCode ].imgEtat;
                //$ionicLoading.hide();
            */
        }).
        error(function(data, status, headers, config) {
        // called asynchronously if an error occurs
        // or server returns response with an error status.
            console.log("Status : "+status+" Data : "+data);
        });


        // Afficher le loading jusqu'à ce que la centrale ait transmis son changement d'état ou jusqu'au timeout (5minutes)
        $scope.loadingIndicator = $ionicLoading.show({
            template: "Attente de la centrale <br/>(ceci peut prendre jusqu'à trois minutes)<br/><ion-spinner icon=\"lines\" class=\"iconChargementEtat\"></ion-spinner>",
            showBackdrop: false,
            delay: 500
        });
        $timeout(function(){
            $interval.cancel(demandePromise);
            $ionicLoading.hide();
            $ionicPopup.alert({
                title: 'Pas de réponse de la centrale',
                template:   "Notez que seules les centrales équipées d'une carte SIM ou branchées "+
                            "sur une box Internet ont accès à cette fonctionnalité. <br>"+
                            "Si le problème persiste, veuillez contacter votre technicien.",
                okType: 'button-dark'
            });

        },180000);
    }
})

.controller('HistoriqueCtrl', function($scope, $http, $localstorage, $state) {
    // ce controller permet d'obtenir l'historique de l'alarme
    $scope.historique = [];

    function getHTTPHistorique(){
        $http({
            method: 'POST',
            url: 'http://62.210.198.116:64803/service.php',
            data:  {    clientID: $localstorage.getObject("client").clientID,
            cleService:$localstorage.getObject("client").cleService,
            type: 'clientEvenements'
        }
    }).
        success(function(data, status, headers, config) {
          //console.log("Historique : "+JSON.stringify(data));
          //historiqueComplet = JSON.stringify(data);
          $scope.historique = data;
          //console.log("Historique du scope = "+$scope.historique);

      }).
        error(function(data, status, headers, config) {
            // called asynchronously if an error occurs
            // or server returns response with an error status.
            console.log("Status : "+status+" Data : "+data);
        });
    }

    $scope.reload = function(){
        getHTTPHistorique();
    };

    getHTTPHistorique();



    /*
    $scope.chats = Chats.all();
    $scope.remove = function(chat) {
        Chats.remove(chat);
    }
    */
})

.controller('ImagesCtrl', function($scope, $http, $localstorage, $ionicModal) {
    // ce controller permet d'obtenir l'historique de l'alarme
    $scope.images = [];

    $scope.reload = function(){
        getHTTPImages();
    };

    function getHTTPImages(){
        $http({
            method: 'POST',
            url: 'http://62.210.198.116:64803/service.php',
            data:  {    clientID: $localstorage.getObject("client").clientID,
                cleService:$localstorage.getObject("client").cleService,
                type: 'clientImages'
            }
        }).
        success(function(data, status, headers, config) {
          //console.log("Historique : "+JSON.stringify(data));
          //historiqueComplet = JSON.stringify(data);
          $scope.images = data;
          //console.log("Images du scope = "+$scope.images);

        }).
        error(function(data, status, headers, config) {
            // called asynchronously if an error occurs
            // or server returns response with an error status.
            console.log("Status : "+status+" Data : "+data);
        });
    }
    getHTTPImages();

    var selectedImage;
    $scope.visuImage = function(img, imgDate){
        $ionicModal.fromTemplateUrl('image-visu.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function(modal) {
            $scope.modal = modal;
            $scope.modal.show();
        });

        $scope.imgDate = imgDate;

        $scope.imgPicsB64 = [];
        $http({
            method: 'POST',
            url: 'http://62.210.198.116:64803/service.php',
            data:  {    clientID: $localstorage.getObject("client").clientID,
                cleService:$localstorage.getObject("client").cleService,
                type: 'visualisationImage',
                typeArg1: img
            }
        }).
        success(function(data, status, headers, config) {
          //console.log("Historique : "+JSON.stringify(data));
          //historiqueComplet = JSON.stringify(data);
          $scope.imgPicsB64 = data;
          //console.log("Images du scope = "+$scope.images);

        }).
        error(function(data, status, headers, config) {
            // called asynchronously if an error occurs
            // or server returns response with an error status.
            console.log("Status : "+status+" Data : "+data);
        });

    }
    $scope.openModal = function() {
        $scope.modal.show()
    }

    $scope.closeModal = function() {
        $scope.modal.hide();
    };

    $scope.$on('$destroy', function() {
        $scope.modal.remove();
    });

})

.controller('ConfigurationCtrl', function($scope, $localstorage, $http, $state, $ionicPopup) {
    $scope.client = $localstorage.getObject("client");

    $scope.ModifierClient = function(){
        $localstorage.setObject("client", $scope.client);

        $http({
            method: 'POST',
            url: 'http://62.210.198.116:64803/service.php',
            data:  {    clientID: $localstorage.getObject("client").clientID,
                cleService:$localstorage.getObject("client").cleService,
                type: 'modificationClient',
                typeArg1: $localstorage.getObject("client")
            }
        }).
        success(function(data, status, headers, config) {
            $http({
                method: 'POST',
                url: 'http://62.210.198.116:64803/service.php',
                data:  {    clientID: $localstorage.getObject("client").clientID,
                    cleService:$localstorage.getObject("client").cleService,
                    type: 'clientJson'
                }
            }).
            success(function(data, status, headers, config) {
                $localstorage.setObject("client", data);
            }).
            error(function(data, status, headers, config) {
                // called asynchronously if an error occurs
                // or server returns response with an error status.
                console.log("Status : "+status+" Data : "+data);
            });
            $ionicPopup.alert({
                title: 'Client modifié',
                template:   "Les informations ont bien été enregistrées.",
                okType: 'button-dark'
            });

            $state.go('tab.configuration');
        }).
        error(function(data, status, headers, config) {
            // called asynchronously if an error occurs
            // or server returns response with an error status.
            console.log("Status : "+status+" Data : "+data);
        });


    }

});
