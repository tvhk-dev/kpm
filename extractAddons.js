const fs = require("fs"),
    xmlParser = require('fast-xml-parser');
var xml = fs.readFileSync(process.argv[2]).toString();
var j = xmlParser.parse(xml, {
    ignoreAttributes: false,
    attributeNamePrefix: "",
    textNodeName: "$t"
});

function cloneObject(js) {
    return JSON.parse(JSON.stringify(js));
}


var result = {};
result[j.addon.id] = {
    extension: [
        {
            point: "xbmc.addon.metadata",
            path: "",
        }
    ],
    requires: cloneObject(j.addon.requires)
};
console.log(JSON.stringify(result));

var x = {
    "skin.aura-tvhk": {
        "extension": [{"point": "xbmc.addon.metadata", "path": ""}],
        "requires": {
            "import": [{"addon": "xbmc.gui", "version": "5.14.0"}, {
                "addon": "script.skinshortcuts",
                "version": "0.4.0"
            }, {"addon": "script.extendedinfo", "version": "3.0.0"}, {
                "addon": "script.image.resource.select",
                "version": "0.0.5"
            }, {
                "addon": "plugin.program.autocompletion",
                "version": "1.0.1"
            }, {
                "addon": "resource.images.studios.white",
                "version": "0.0.10"
            }, {"addon": "resource.images.moviegenreicons.transparent", "version": "0.0.6"}]
        }
    }
};