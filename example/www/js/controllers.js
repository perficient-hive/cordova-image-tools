angular.module('imagetoolsApp.controllers', [])

.controller('DashboardCtrl', function($scope, $cordovaDevice, $cordovaFile, $ionicPlatform, $ionicActionSheet, $q, ImageService, FileService) {

    $scope.images = [];

    var canvas = new fabric.Canvas('mainCanvas');
    canvas.hoverCursor = 'pointer';
    canvas.selection = false;
    var canvasImage = null;
    var canvasFirstBar = null;
    var canvasSecondBar = null;
    var canvasFirstBarYOffset = 0;
    var canvasSecondBarYOffset = 0;


    $ionicPlatform.ready(function() {
        // Use html wrapper for sizing
        var $canvasWrapper = $(".canvasWrapper");
        canvas.setDimensions({width:$canvasWrapper.width(), height:$canvasWrapper.height()});
        canvas.renderAll();
        console.log("canvas width:" + canvas.getWidth() + " height:" + canvas.getHeight());

        // Make sure images folder exists and is empty
        ImageService.prepareFolder();
    });

    $scope.zoomIn = function() {
        // Zoom image in, keeping current view centered
        var newZoom = canvas.getZoom() * 1.1;
        console.log("new zoom: " + newZoom);
        var centerPoint = new fabric.Point(canvas.getCenter().left, canvas.getCenter().top);
        canvas.zoomToPoint(centerPoint, newZoom);
    }

    $scope.zoomOut = function() {
        // Zoom image out, keeping current view centered
        if (canvas.getZoom() <= 1) {
            // Prevent zooming out more than initial zoom
            canvas.setZoom(1.0);
            return;
        }
        var newZoom = canvas.getZoom() / 1.1;
        console.log("new zoom: " + newZoom);
        var centerPoint = new fabric.Point(canvas.getCenter().left, canvas.getCenter().top);
        canvas.zoomToPoint(centerPoint, newZoom);
    }

    $scope.measure = function() {
        // Use plugin to calculate scale and measure distance between bars
        var imageName = $scope.images[0];
        var imagePath = cordova.file.dataDirectory + "images/" + imageName;
        var imageScale = canvasImage.getScaleX();  //X and Y scaled equally, so shouldn't need both
        var canvasZoom = canvas.getZoom();
        var topBarY = canvasFirstBar.getTop() + (canvasFirstBar.getHeight() / 2);  //middle of bar
        var bottomBarY = canvasSecondBar.getTop() + (canvasSecondBar.getHeight() / 2);  //middle of bar
        var squarePhysicalHeight = 0.75;  //inches per square
        imagetools.measure(imagePath, imageScale, canvasZoom, topBarY, bottomBarY, squarePhysicalHeight, function(message) {
            alert(message);
        },
        function() {
            alert("Error calling ImageTools Plugin measure()");
        });
    }

    $scope.buildImage = function(imageName) {
        var deferred = $q.defer();
        var trueOrigin = cordova.file.dataDirectory + "images/" + imageName;

        // Clear previous image and bars
        canvas.clear();
        canvas.renderAll();

        // Create new fabric.js image
        canvasImage = new fabric.Image();
        canvasImage.setSrc(trueOrigin, function(image) {

            // Rotate and scale to fit canvas
            // (Photos assumed to be taken in portrait, phone always stores them as landscape, so we need to rotate)
            canvasImage.setAngle(90);
            canvasImage.scaleToHeight(canvas.getHeight());
            console.log("scaleX:" + canvasImage.getScaleX() + " scaleY:" + canvasImage.getScaleY());
            //example: scaleX:0.07396950875211745 scaleY:0.07396950875211745

            // Prevent image from being manually rotated or resized
            canvasImage.hasControls = false;

            // Add image to canvas
            canvasImage.myId = "idImage";
            canvas.add(canvasImage);

            // Center image on canvas, and realign its border overlay
            canvasImage.center();
            canvasImage.setCoords();

            // Create measuring bars
            canvasFirstBar = createBar(canvas.getWidth(), "green", "red");
            canvasFirstBar.set({top: 75}).setCoords();
            canvasFirstBarYOffset = canvasFirstBar.top - canvasImage.top;
            canvasFirstBar.myId = "idFirstBar";
            canvasSecondBar = createBar(canvas.getWidth(), "green", "red");
            canvasSecondBar.set({top: canvas.getHeight() - 75 - canvasSecondBar.getHeight()}).setCoords();
            canvasSecondBarYOffset = canvasSecondBar.top - canvasImage.top;
            canvasSecondBar.myId = "idSecondBar";
            canvas.add(canvasFirstBar, canvasSecondBar);

            // Refresh canvas
            canvas.renderAll();

            deferred.resolve(canvas);
        });

        return deferred.promise;

    };

    $scope.urlForImage = function(imageName) {
        var trueOrigin = cordova.file.dataDirectory + "images/" + imageName;
        return trueOrigin;
    }

    $scope.addMedia = function() {
        $scope.hideSheet = $ionicActionSheet.show({
            buttons: [
                { text: '<i class="icon ion-camera dark"></i> Take photo' },
                { text: '<i class="icon ion-images dark"></i> Photo from library' }
            ],
            titleText: 'Acquire Image',
            cancelText: 'Cancel',
            buttonClicked: function(index) {
                $scope.addImage(index);
            }
        });
    }

    $scope.addImage = function(type) {
        $scope.hideSheet();
        ImageService.handleMediaDialog(type).then(function() {
            $scope.images = FileService.images();
            var mostRecent = $scope.images[$scope.images.length - 1];
            $scope.buildImage(mostRecent);
        });
    }

    function createBar(barWidth, barStroke, barFill) {
        // Draw a line across screen, with a triangle at each end
        var width = barWidth - 1; //adjust for right edge cropping
        var inset = 15;
        var path = new fabric.Path(
            'M 0 0 '+
            'L '+inset+' '+inset+' '+
            'L '+(width-inset)+' '+inset+' '+
            'L '+width+' 0 '+
            'L '+width+' '+(inset*2)+' '+
            'L '+(width-inset)+' '+inset+' '+
            'L '+inset+' '+inset+' '+
            'L 0 '+(inset*2)+' '+
            'z');
        path.set({
            stroke: barStroke,
            fill: barFill,
            opacity: 0.5,
            hasControls: false,
            lockMovementX: true
        });
        return path;
    }

    // Keep track of bars' position relative to image, so when panning the image we can keep bars aligned
    canvas.on('object:moving', function (e) {
        //console.log("OBJECT:MOVING");
        var obj = e.target;
        handleMovement(obj);
    });
    canvas.on('object:modified', function (e) {
        //console.log("OBJECT:MODIFIED");
        var obj = e.target;
        handleMovement(obj);
    });

    function handleMovement(obj) {
        if (obj.myId == "idImage") {
            canvasFirstBar.set({top: canvasImage.top + canvasFirstBarYOffset}).setCoords();
            canvasSecondBar.set({top: canvasImage.top + canvasSecondBarYOffset}).setCoords();
            //console.log("canvasFirstBar.top:" + canvasFirstBar.top + " canvasSecondBar.top:" + canvasSecondBar.top);
        } else if (obj.myId == "idFirstBar") {
            canvasFirstBarYOffset = canvasFirstBar.top - canvasImage.top;
            //console.log("canvasFirstBarYOffset: " + canvasFirstBarYOffset);
        } else if (obj.myId == "idSecondBar") {
            canvasSecondBarYOffset = canvasSecondBar.top - canvasImage.top;
            //console.log("canvasSecondBarYOffset: " + canvasSecondBarYOffset);
        }
    }

})


.controller('SettingsCtrl', function($scope, AppSettings) {
    $scope.AppSettings = AppSettings;
    $scope.urlForImage = function(imageName) {
        var name = imageName.substr(imageName.lastIndexOf('/') + 1);
        var trueOrigin = cordova.file.dataDirectory + "images/" + name;
        return trueOrigin;
    }
});

