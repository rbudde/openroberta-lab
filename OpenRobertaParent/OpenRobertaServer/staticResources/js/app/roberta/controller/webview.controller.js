define([ 'exports', 'guiState.controller', 'wedo.model', 'interpreter.interpreter', 'util', 'log', 'message', 'blocks', 'jquery' ], function(exports,
        GUISTATE_C, WEDO_M, WEDO_I, UTIL, LOG, MSG, Blockly, $) {

    var ready;
    var aLanguage;
    var webViewType;
    /**
     * Init webview
     */
    function init(language) {
        aLanguage = language;
        ready = $.Deferred();
        var a = {};
        a.target = 'internal';
        a.op = {};
        a.op.type = 'identify';
        if (tryAndroid(a)) {
            webViewType = "Android";
        } else if (tryIOS(a)) {
            webViewType = "IOS";
        } else {
            // Obviously not in an Open Roberta webview
            ready.resolve(language);
        }
        return ready.promise();
    }
    exports.init = init;

    function appToJsInterface(jsonData) {
        try {
            var data = JSON.parse(jsonData);
            if (!data.target || !data.op || !data.op.type) {
                throw "invalid arguments";
            }
            if (data.target == "internal") {
                if (data.op.type == "identify") {
                    ready.resolve(aLanguage, data.op.app.name);
                } else {
                    throw "invalid arguments";
                }
            } else if (data.target == "wedo" && GUISTATE_C.getRobot() == "wedo") {
                if (data.op.type == "scan" && data.op.state == "appeared") {
                    $('#show-available-connections').trigger('add', data.op);
                } else if (data.op.type == "scan" && data.op.state == "error") {
                    $('#show-available-connections').modal('hide');
                } else if (data.op.type == "scan" && data.op.state == "disappeared") {
                    console.log(data);
                } else if (data.op.type == "connect" && data.op.state == "connected") {
                    $('#show-available-connections').trigger('connect', data.op);
                    WEDO_M.update(data);
                    GUISTATE_C.setConnectionState("wait");
                    var bricklyWorkspace = GUISTATE_C.getBricklyWorkspace();
                    var blocks = bricklyWorkspace.getAllBlocks();
                    for (var i = 0; i < blocks.length; i++) {
                        if (blocks[i].type === "robBrick_WeDo-Brick") {
                            var field = blocks[i].getField("VAR");
                            field.setValue(data.op.brickname.replace(/\s/g, ''));
                            blocks[i].render();
                            var dom = Blockly.Xml.workspaceToDom(bricklyWorkspace);
                            var xml = Blockly.Xml.domToText(dom);
                            GUISTATE_C.setConfigurationXML(xml);
                            bricklyWorkspace.setVisible(false);
                            break;
                        }
                    }
                } else if (data.op.type == "connect" && data.op.state == "disconnected") {
                    WEDO_M.update(data);
                    WEDO_I.terminate();
                    var bricklyWorkspace = GUISTATE_C.getBricklyWorkspace();
                    var blocks = bricklyWorkspace.getAllBlocks();
                    for (var i = 0; i < blocks.length; i++) {
                        if (blocks[i].type === "robBrick_WeDo-Brick") {
                            var field = blocks[i].getField("VAR");
                            field.setValue(Blockly.Msg.ROBOT_DEFAULT_NAME_WEDO || Blockly.Msg.ROBOT_DEFAULT_NAME || "Brick1");
                            blocks[i].render();
                            var dom = Blockly.Xml.workspaceToDom(bricklyWorkspace);
                            var xml = Blockly.Xml.domToText(dom);
                            GUISTATE_C.setConfigurationXML(xml);
                            bricklyWorkspace.setVisible(false);
                            break;
                        }
                    }
                    GUISTATE_C.setConnectionState("error");
                } else {
                    WEDO_M.update(data);
                }
            } else {
                throw "invalid arguments";
            }
        } catch (error) {
            LOG.error("appToJsInterface >" + error + " caused by: " + jsonData);
        }
    }
    exports.appToJsInterface = appToJsInterface;

    function jsToAppInterface(data) {
        try {
            if (webViewType === "Android") {
                OpenRoberta.jsToAppInterface(JSON.stringify(data));
            } else if (webViewType === "IOS") {
                window.webkit.messageHandlers.OpenRoberta.postMessage(JSON.stringify(data));
            } else {
                throw "invalid webview type";
            }
        } catch (error) {
            LOG.error("jsToAppInterface >" + error + " caused by: " + data);
        }
    }
    exports.jsToAppInterface = jsToAppInterface;

    function tryAndroid(data) {
        try {
            OpenRoberta.jsToAppInterface(JSON.stringify(data));
            return true;
        } catch (error) {
            LOG.error("no Android Webview: " + error);
            return false;
        }
    }

    function tryIOS(data) {
        try {
            window.webkit.messageHandlers.OpenRoberta.postMessage(JSON.stringify(data));
            return true;
        } catch (error) {
            LOG.error("no IOS Webview: " + error);
            return false;
        }
    }

    function jsToDisplay(action) {
        if (action.show !== undefined) {
            $("#showDisplayText").append("<div>" + action.show + "</div>");
            if (!$('#showDisplayText').is(':visible')) {
                $('#showDisplay').one('hidden.bs.modal', function() {
                    $("#showDisplayText").empty();
                })
                $("#showDisplay").modal("show");
            }
            $('#showDisplayText').scrollTop($('#showDisplayText').prop("scrollHeight"));
        } else if (action.clear !== undefined) {
            $("#showDisplayText").empty();
        }
    }
    exports.jsToDisplay = jsToDisplay;
});