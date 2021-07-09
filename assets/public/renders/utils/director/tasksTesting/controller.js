$scope.displayMessage = false;
$scope.message = "";
$scope.responseCode = "";
$scope.scriptResponse = "";
$scope.form = {
    scriptText : "",
    scriptConfig : undefined
}
var scriptTextEditor = undefined;
var scriptConfigEditor = undefined;
var scriptResponseEditor = undefined;

var buildTestPayload = (scriptText,scriptConfig) => {
    let config = JSON.parse(scriptConfig)
    return { 
        "scriptText" : scriptText,
        "scriptConfig" : config
    }
}

jQuery.loadScript = function (url, callback) {
    jQuery.ajax({
        url: url,
        dataType: 'script',
        success: callback,
        async: true
    });
}


$.loadScript('https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.62.0/codemirror.min.js', function(){
    $.loadScript('https://codemirror.net/mode/javascript/javascript.js', function(){
        scriptTextEditor = CodeMirror.fromTextArea(document.getElementById("scriptText"), {
            mode: "javascript",
            lineNumbers: true,
            theme: "monokai"
        });
        scriptConfigEditor = CodeMirror.fromTextArea(document.getElementById("scriptConfig"), {
            mode: "javascript",
            lineNumbers: true,
            theme: "monokai"
        });
        scriptResponseEditor = CodeMirror.fromTextArea(document.getElementById("scriptResponse"), {
            mode: "javascript",
            lineNumbers: true,
            theme: "monokai",
            readOnly:true
        });
    });
});




$scope.testScript = function() {
    $scope.displayMessage = true;
    $scope.form.scriptText = scriptTextEditor.getValue();
    $scope.form.scriptConfig = scriptConfigEditor.getValue();
    if ($scope.form.scriptText !== "" && $scope.form.scriptConfig !== "") {
        //Building payload
        try{
            var payload= buildTestPayload($scope.form.scriptText,$scope.form.scriptConfig);
        }catch(err){
            console.log(err);
            $scope.message = "badFields";
            $scope.taskTestResponse = "Bad JSON configuration";
            return;
        }
        
        // Test Task
        let url = "$_[infrastructure.external.director.default]/api/v1/tasks/test";
        
        $http.post(url,payload).then(response => {
            $scope.message = "ok";
            $scope.taskTestResponse = "Script successfully tested";
            $scope.responseCode = response.status.toString();
            $scope.scriptResponse = JSON.stringify(response.data);
            scriptResponseEditor.setValue(JSON.stringify(response.data));
        }).catch(err => {
            $scope.message = "error";
            $scope.taskTestResponse = "Script unsuccessfully tested";
            $scope.responseCode = 500;
            console.log(err);
        })
    }else{
        $scope.message = "badFields";
        $scope.taskTestResponse = "You must fill in all the fields";
    }
}


$scope.loadFile = function() {
    let f = document.getElementById('file').files[0];
    if(f.type.match('^text/plain') || f.type.match('^text/javascript')){
        let reader = new FileReader();
        reader.addEventListener('load', function (e) {
            let data = e.target.result;
            $scope.$apply(function(){$scope.form.scriptText = data;});;
            scriptTextEditor.setValue(data);
        });
        reader.readAsBinaryString(f);
    }
}