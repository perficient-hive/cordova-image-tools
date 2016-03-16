angular.module('imagetoolsApp.services', ['imagetoolsApp.globals'])

.factory('FileService', function() {
    var images;
    var IMAGE_STORAGE_KEY = 'images';
 
    function getImages() {
        var img = window.localStorage.getItem(IMAGE_STORAGE_KEY);
        if (img) {
            console.log(img);
            images = JSON.parse(img);
        } else {
            images = [];
        }
        return images;
    };
 
    function addImage(img) {
        //images.push(img);
        images = [img];
        window.localStorage.setItem(IMAGE_STORAGE_KEY, JSON.stringify(images));
    };
 
    return {
        storeImage: addImage,
        images: getImages
    }
})

.factory('ImageService', function($cordovaCamera, FileService, $q, $cordovaFile, $cordovaFileTransfer) {

    function prepare() {
        $cordovaFile.checkDir(cordova.file.dataDirectory, "images")
            .then(function (checkDirResult) {
                // Found
                console.log(JSON.stringify(checkDirResult));
                console.log("Folder already exists - wipe previous images");
                $cordovaFile.removeRecursively(cordova.file.dataDirectory, "images")
                    .then(function(removeRecursivelyResult) {
                        // Success
                        console.log("Wiped previous images");
                        console.log(JSON.stringify(removeRecursivelyResult));

                        console.log("Recreate folder now");
                        $cordovaFile.createDir(cordova.file.dataDirectory, "images", false)
                            .then(function(createDirResult) {
                                // Success
                                console.log("Recreated folder");
                                console.log(JSON.stringify(createDirResult));
                            }, function(createDirError) {
                                // Error
                                console.log("Could not recreate folder");
                                console.log(JSON.stringify(createDirError));
                            });
                    }, function(removeRecursivelyError) {
                        // Error
                        console.log("Could not wipe previous images");
                        console.log(JSON.stringify(removeRecursivelyError));
                    });
            }, function (checkDirError) {
                // Not found
                console.log(JSON.stringify(checkDirError));
                console.log("Folder does not exist - create it");
                $cordovaFile.createDir(cordova.file.dataDirectory, "images", false)
                    .then(function(createDirResult) {
                        // Success
                        console.log("Created folder");
                        console.log(JSON.stringify(createDirResult));
                    }, function(createDirError) {
                        // Error
                        console.log("Could not create folder");
                        console.log(JSON.stringify(createDirError));
                    });
            });
    };

    function makeid() {
        var text = '';
        var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
 
        for (var i = 0; i < 5; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    };
 
    function optionsForType(type) {
        var source;
        switch (type) {
            case 0:
                source = Camera.PictureSourceType.CAMERA;
                break;
            case 1:
                source = Camera.PictureSourceType.PHOTOLIBRARY;
                break;
        }
        return {
            destinationType: Camera.DestinationType.FILE_URI,
            sourceType: source,
            allowEdit: false,
            encodingType: Camera.EncodingType.JPEG,
            popoverOptions: CameraPopoverOptions,
            saveToPhotoAlbum: false
        };
    }
 
    function saveMedia(type) {
        return $q(function(resolve, reject) {
            var options = optionsForType(type);
 
            $cordovaCamera.getPicture(options).then(
                function(imageUri) {
                    var name = imageUri.substr(imageUri.lastIndexOf('/') + 1);
                    var namePath = imageUri.substr(0, imageUri.lastIndexOf('/') + 1);
                    var newName = makeid() + name;
                    //newName = "photoForMeasuring.jpg";  //OVERRIDE TO PREVENT MULTIPLE

                    // Copy new file
                    console.log("Copy new file");
                    //$cordovaFile.copyFile(namePath, name, cordova.file.dataDirectory + "images/", newName).then(
                    $cordovaFileTransfer.download(imageUri, cordova.file.dataDirectory + "images/" + newName, {}, true).then(
                        function(info) {
                            console.log("Add reference to new file");
                            FileService.storeImage(newName);

                            resolve();
                        }, function(e) {
                            console.log(JSON.stringify(e));
                            reject();
                        });
                }
            );
        })
    }
    return {
        handleMediaDialog: saveMedia,
        prepareFolder: prepare
    }
});


