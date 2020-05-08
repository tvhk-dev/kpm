#!/usr/bin/env bash
#============config============#
addons="plugin.video.tvhk plugin.video.peertube plugin.video.aura-tvhk script.module.libtorrent_easy"
kodiVersion=18
extraRepo="https://raw.githubusercontent.com/tvhk-dev/tvhk-kodi-repo/master/kpmRepo.json"

#============config============#

# @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
#
#   This is proof of concept only code
#  Untested, don't try on live machine!!
#
# @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

cd ~/
mkdir install
cd ~/install
opkg install node-js git sqlite3
git clone https://github.com/tvhk-dev/kpm.git
cd ~/install/kpm
npm install
mkdir ~/install/addons
./kpm.js --to=~/install/addons --kodi=$kodiVersion --extra=$extraRepo $addons -y
cd ~/install/addons
cp -Rf ./* ~/.kodi/addons/
systemctl restart kodi
sleep 10 #wait for kodi to install(write to db) addons
systemctl stop kodi
addonIDs=()
for dir in */; do addonIDs+=(${dir%?}); done
for id in addonIDs
do
sqlite3 ~/.kodi/userdata/Database/Addons27.db 'update installed set enabled=1 where addonid=="$id";'
done
systemctl start kodi