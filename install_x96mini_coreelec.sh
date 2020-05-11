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

read -r -p "Did you finish running installtointernal? [y/N] " response
case "$response" in
    [yY][eE][sS]|[yY])
        echo "OK"
        ;;
    *)
        echo "Go for installtointernal first!"
        exit 1
        ;;
esac

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
~/.opt/bin/node ./kpm.js --to=/storage/install/addons --kodi=$kodiVersion --overlay=$extraRepo $addons -y
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

#remote
systemctl stop eventlircd
echo "meson-ir        *     /storage/.config/rc_keymaps/X96" >> /storage/.config/rc_maps.cfg
printf "0x140 KEY_POWER\n0x144 KEY_SUBTITLE\n0x155 KEY_PREVIOUS\n0x15a KEY_PLAYPAUSE\n0x152 KEY_STOP\n0x154 KEY_NEXT\n0x143 KEY_CONFIG\n0x10f KEY_INFO\n0x110 KEY_VOLUMEDOWN\n0x118 KEY_VOLUMEUP\n0x111 KEY_HOME\n0x119 KEY_BACK\n0x14c KEY_MENU\n0x100 KEY_CONTEXT_MENU\n0x116 KEY_UP\n0x151 KEY_LEFT\n0x150 KEY_RIGHT\n0x11a KEY_DOWN\n0x113 KEY_OK\n0x101 KEY_NUMERIC_0\n0x14e KEY_NUMERIC_1\n0x10d KEY_NUMERIC_2\n0x10c KEY_NUMERIC_3\n0x14a KEY_NUMERIC_4\n0x109 KEY_NUMERIC_5\n0x108 KEY_NUMERIC_6\n0x146 KEY_NUMERIC_7\n0x105 KEY_NUMERIC_8\n0x104 KEY_NUMERIC_9\n0x141 KEY_MUTE\n0x142 KEY_BACKSPACE\n" > /storage/.config/rc_keymaps/X96
ir-keytable -a /storage/.config/rc_maps.cfg -s rc0
systemctl start eventlircd

systemctl start kodi
