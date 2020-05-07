#!/usr/bin/env node
const
    fs = require("fs"),
    xmlParser = require('fast-xml-parser'),
    argv = require('yargs'),
    wget = require('node-wget-promise'),
    path = require('path'),
    randomstring = require("randomstring"),
    unzip = require('extract-zip'),
    rmdir = require('rimraf'),
    zlib = require('zlib'),
    terminalPrompt = require('prompt-sync')();


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
    repo: {},
    repoIDs: [],
    argv: argv.argv,
    installQueue: [],
    tmp: "",
    kodiVersion: "",
    isOverwrite: false
};

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

async function installPackage(names) {
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
    var isConflicted = false;
    for (var i = 0; i < folders.length; i++) {
        //Folder exist check
        if (fs.existsSync(current.installDestination + "/" + folders[i])) {
            isConflicted = true;
            if (current.isOverwrite) {
                //Do nothing
            } else {
                var ask = terminalPrompt("Some package exist, continue to overwrite **ALL** packages[n]?");
                if (ask.toString().toLocaleLowerCase() == "y" || ask.toString().toLocaleLowerCase() == "yes") {
                    current.isOverwrite = true;
                } else {
                    break;
                }

            }
        }
    }
    if (!isConflicted || (isConflicted && current.isOverwrite)) {
        for (var i = 0; i < folders.length; i++) {
            try {
                rmdir.sync(current.installDestination + "/" + folders[i]);
                fs.renameSync(current.tmp + "/" + folders[i], current.installDestination + "/" + folders[i]);
            }
            catch (e) {
                console.log("Error: ", e.message);
                break;
            }
        }
    }
}

//================main entry point================//

async function main() {
    if (!current.argv.to || !current.argv.kodi || current.argv._.length == 0) {
        if (current.argv.h === true || current.argv.help == true) {
            console.log(
                "\n" +
                "Kodi addon package manager\n" +
                "\n" +
                "Usage: kpm --to=<dest path> --kodi=<kodi version> package1 [package2...] [-y]\n" +
                "\n" +
                "    -h / --help    This help\n" +
                "    -to            Installation destination folder\n" +
                "    -kodi          Kodi version (16|17|18|19)\n" +
                "    -extra         Extra package repository URL, in JSON format\n" +
                "    -y             Default yes to overwite package if exist\n" +
                "\n"
            );
        } else {
            console.log("Usage: kpm --to=<dest path> --kodi=<kodi version> package1 [package2...] [-y]");
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
        if (current.argv.y === true) current.isOverwrite = true;
        current.kodiVersion = config.kodiVersionString[current.argv.kodi];
        current.tmp = path.resolve(current.argv.to) + "/.tmp_" + randomstring.generate(16);
        current.installDestination = path.resolve(current.argv.to);
        fs.mkdirSync(current.tmp);

        process.stdout.write("Downloading kodi official repo......");
        await wget("http://mirrors.kodi.tv/addons/" + current.kodiVersion + "/addons.xml.gz", {output: current.tmp + "/addons.xml.gz"});
        console.log("done");

        process.stdout.write("Reading repo......");
        var xml = zlib.unzipSync(fs.readFileSync(current.tmp + "/addons.xml.gz")).toString();
        current.repo = xmlParser.parse(xml, {
            ignoreAttributes: false,
            attributeNamePrefix: "",
            textNodeName: "$t"
        }).addons.addon || {};
        for (var i = 0; i < current.repo.length; i++) {
            current.repoIDs.push(current.repo[i].id);
        }
        console.log("done");

        for (var i = 0; i < current.argv._.length; i++) {
            current.installQueue.push(current.argv._[i]);
            walkThroughDeps(resolveDeps(current.argv._[i]));
        }
        console.log("List of package to install(" + current.installQueue.length.toString() + "):")
        for (var i = 0; i < current.installQueue.length; i++) {
            console.log(current.installQueue[i]);
        }

        await installPackage(current.installQueue);

        process.stdout.write("Clearing up......");
        rmdir.sync(current.tmp);
        console.log('done');
    }
}

main();