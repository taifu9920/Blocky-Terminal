# Blocky Terminal
#### A Minecraft server web management tool on NodeJS, 
#### Have a nice and clean interface to do anything on servers.
#### Manage all your Minecraft server on the web.
#### You can do any operations on the web interface,
## Including :
* Power on/off
* Quick Reboot & Auto Reboot
* Force stop (Scram)
* File System on Web (Upload/Delete/Edit)
* ~~Account Management~~ [WIP]
* ~~Quick Download~~ [WIP]
## Demos:
![demo1](https://github.com/taifu9920/Blocky-Terminal/blob/main/demos/Home.png)
![demo2](https://github.com/taifu9920/Blocky-Terminal/blob/main/demos/Home_with_toolbar_opened.png)
![demo3](https://github.com/taifu9920/Blocky-Terminal/blob/main/demos/configure.png)
![demo4](https://github.com/taifu9920/Blocky-Terminal/blob/main/demos/filesystem.png)
![demo5](https://github.com/taifu9920/Blocky-Terminal/blob/main/demos/server_off.png)
![demo6](https://github.com/taifu9920/Blocky-Terminal/blob/main/demos/server_on.png)
## How this made?
#### The management tool has implemented built-in [elfinder](https://github.com/Studio-42/elFinder) 2.1.61
#### So you can access to the file system to edit config, upload servers, or delete any files
#### It's made by Node.js with express, and there're a route to run elfinder (used module [php-express](https://github.com/fnobi/php-express))
## Requirements:
#### Nodejs, PHP
## How to install:
#### 1. Dowload Nodejs and PHP, make sure to set PATH for them
#### 2. Clone this project with `git clone <URL>`
#### 3. Copy the `example.env` file into `.env`, then edit the content to fit your like
#### 4. Get inside the root location of this project and run `npm install`
#### 5. If no errors, You can run `node run` to start the web
## Q&A:
#### Q: Where are the file system located?
#### A: `filesys/files/`
