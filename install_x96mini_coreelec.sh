#!/usr/bin/env bash
#============config============#
addons="plugin.video.tvhk plugin.video.peertube skin.aura-tvhk"
kodiVersion=18
extraRepo="https://raw.githubusercontent.com/tvhk-dev/tvhk-kodi-repo/master/kpmRepo/kodi_18_shop.json"

#============config============#

# @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
#
# Tested working in x96 mini w/CoreElec 9.2.2
#
# @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

read -p "Did you finish running installtointernal? " -n 1 -r
echo    # (optional) move to a new line
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "OK"
else
    echo "Go for installtointernal first!"
    exit 1
fi

printf 'n\n' | installentware #https://discourse.coreelec.org/t/what-is-entware-and-how-to-install-uninstall-it/1149

cd ~/
mkdir install
cd ~/install
~/.opt/bin/opkg install node git-http node-npm

#TODO: NTP client
~/.opt/bin/git clone https://github.com/tvhk-dev/kpm.git
cd ~/install/kpm
~/.opt/bin/npm install
mkdir ~/install/addons
~/.opt/bin/node ./kpm.js --to=/storage/install/addons --kodi=$kodiVersion --extra=$extraRepo $addons -y
cd ~/install/addons
cp -Rf ./* ~/.kodi/addons/
systemctl restart kodi
sleep 3 #wait for kodi to install(write to db) addons
systemctl stop kodi
#enable plugins
for dir in */; do sqlite3 /storage/.kodi/userdata/Database/Addons27.db "update installed set enabled=1 where addonid==\"${dir%?}\";"; done
#swtich skin
sed -i -e 's/skin\.estuary/skin\.aura-tvhk/g' /storage/.kodi/userdata/guisettings.xml
sed -i -e 's/default="true">skin\.aura-tvhk/>skin\.aura-tvhk/g' /storage/.kodi/userdata/guisettings.xml
systemctl start kodi
