#!/usr/bin/env node
const
    fs = require("fs"),
    xml2json = require("xml2json"),
    argv = require('yargs'),
    wget = require('node-wget-promise'),
    path = require('path'),
    randomstring = require("randomstring"),
    unzip = require('extract-zip'),
    rmdir = require('rimraf');


var xml = fs.readFileSync("addons.xml");

// xml to json
var repoJSON = xml2json.toJson(xml);

const config = {
    addonMask: {
        mode: "whitelist",
        list: [
            'pvr.', 'script.',
            'plugin.', 'inputstream.',
            'screensaver.', 'service.',
            'metadata.', 'vfs.',
            'weather.', 'skin.',
            'imagedecoder.', 'game.',
            'resource.', 'audiodecoder.',
            'context.', 'visualization.',
            'audioencoder.', 'webinterface.'
        ]
    },
    kodiVersionString: {
        "16": "jarvis",
        "17": "krypton",
        "18": "leia",
        "19": "matrix",
    },
    kodiOfficialRepo: "https://mirrors.kodi.tv/addons",//http://mirrors.kodi.tv/addons/<codename>/addons.xml.gz
};

var current = {
    repo: JSON.parse(repoJSON).addons.addon,
    repoIDs: [],
    argv: argv.argv,
    installQueue: [],
    tmp: "",
    kodiVersion: ""
};

var same = 0;
for (var i = 0; i < current.repo.length; i++) {
    current.repoIDs.push(current.repo[i].id);
}


function getAddon(name) {
    var i = current.repoIDs.indexOf(name);
    if (typeof i == "number") {
        return current.repo[i];
    }
    return null;
}

function resolveDeps(name) {
    var addon = getAddon(name) || {requires: {import: {}}};
    var deps = addon.requires.import || [];
    var result = {};
    for (var i = 0; i < deps.length; i++) {
        var masked = true;
        var addonName = deps[i].addon;
        for (var j = 0; j < config.addonMask.list.length; j++) {
            if (addonName.indexOf(config.addonMask.list[j]) === 0) {
                result[addonName] = resolveDeps(addonName);
            }
        }
    }
    return result;
}

function walkThroughDeps(tree) {
    //Sequence(structure of nest) is not important
    var todo = [tree];
    while (todo.length > 0) {
        var thisLayerName = Object.keys(todo[todo.length - 1]);
        var thisLayer = []
        for (var i = 0; i < thisLayerName.length; i++) {
            thisLayer[i] = todo[todo.length - 1][thisLayerName[i]];
            if (current.installQueue.indexOf(thisLayerName[i]) == -1) {
                current.installQueue.push(thisLayerName[i]);
            }
        }
        todo.splice(todo.length - 1);
        todo = todo.concat(thisLayer);
    }
}

async function downloadPackage(names) {
    for (var i = 0; i < names.length; i++) {
        const addon = getAddon(names[i]);
        var output = null;
        for (var j = 0; j < addon.extension.length; j++) {
            if (addon.extension[j].point == "xbmc.addon.metadata") {
                output = addon.extension[j].path;
            }
        }
        process.stdout.write("Downloading " + names[i] + "......");
        if (output) {
            await wget(config.kodiOfficialRepo + "/" + current.kodiVersion + "/" + output, {output: current.tmp + "/" + path.basename(output)});
            console.log("done");
            await unzip(current.tmp + "/" + path.basename(output), {dir: current.tmp})
            console.log('Extraction completed');
        }
    }

    var folders = fs.readdirSync(current.tmp, {withFileTypes: true}).filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);
    for (var i = 0; i < folders.length; i++) {
        fs.renameSync(current.tmp + "/" + folders[i], current.installDestination + "/" + folders[i]);
    }
    process.stdout.write("Clearing up......");
    rmdir(current.tmp, function (error) {
    });
    console.log('done');
}

if (!current.argv.to || !current.argv.kodi || current.argv._.length == 0) {
    if (current.argv.h === true || current.argv.help == true) {
        console.log(
            "\n" +
            "Usage: kpm --to=<dest path> --kodi=<kodi version> package1 [package2...]\n" +
            "\n" +
            "    -h / --help    This help\n" +
            "    -to            Installation destination folder\n" +
            "    -kodi          Kodi version (16|17|18|19)\n" +
            "    -extra         Extra package repository URL, in JSON format\n"
        );
    } else {
        console.log("Usage: kpm --to=<dest path> --kodi=<kodi version> package1 [package2...]");
    }
} else {
    //real things
    if (!fs.existsSync(current.argv.to)) {
        console.log("Error: Installation destination folder not exist");
        process.exit();
    }
    if (config.kodiVersionString[current.argv.kodi] == undefined) {
        console.log("Error: Invalid Kodi version (16|17|18|19)");
        process.exit();
    }
    current.kodiVersion = config.kodiVersionString[current.argv.kodi];
    current.tmp = path.resolve(current.argv.to) + "/.tmp_" + randomstring.generate(16);
    current.installDestination = path.resolve(current.argv.to);
    fs.mkdirSync(current.tmp);
    for (var i = 0; i < current.argv._.length; i++) {
        current.installQueue.push(current.argv._[i]);
        walkThroughDeps(resolveDeps(current.argv._[i]));
    }
    downloadPackage(current.installQueue);
}
/*
for (var i = 0; i < current.argv.length; i++) {
    current.installQueue.push(current.argv[i]);
    walkThroughDeps(resolveDeps(current.argv[i]));
}

console.log(current.installQueue);
*/