# noncloud

noncloud is HTTPS tunnel over WSS

## Introduction

In the meetup and other situations, we have need to expose our localhost to host demo-application for other participants avoid Firewall. Generally, this is worst way. Tunneling over HTTP have risks by MITM. For this reason, almost services provides tunnels over End-to-End SSL/TLS in paid plan. This project is a simple toolkit to make HTTP tunneling over End-to-End SSL/TLS by WSS (WebSocketSecure). noncloud works on the following route.

```
web browser <--HTTPS--> noncloud server
                              |
~~~~~~~~~~~~~~Firewall~~~~~~ WSS ~~~~~~~
                              |
  localhost <-HTTP(S)-> noncloud client
```

## How to use

You can install noncloud client with :

```sh
$ npm install -g asciian/noncloud
```

`noncloud` has many options but beginner can just type :

```sh
$ noncloud -n example
```

to make HTTPS tunnel over WSS to 80 port at `https://noncloud.herokuapp.com/example`. However this commad isn't secure yet! You need to add `--secure` option to use HTTPS between client and localhost. And if you change the port, then you need to add `--localhost` option. Futhermore you can use other noncloud server. To do this, you also set `--remotehost` option.

## Related Services

- localtunnel
- ngrok
- pagekite

## Copyright & License

Copryright (c) 2018 TANIGUCHI Masaya All Rights Reserved.

noncloud licensed under the GPLv3 or later.