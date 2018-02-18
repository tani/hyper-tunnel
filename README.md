# hyper-tunnel

hyper-tunnel is HTTPS tunnel over WSS

## Introduction

In the meetup and other situations, we have need to expose our localhost to host demo-application avoid Firewall for other participants. Generally, this is worst way. Tunneling over HTTP have risks by MITM. For this reason, almost services provides tunnels over End-to-End SSL/TLS in paid plan. This project is a simple toolkit to make HTTP tunneling over End-to-End SSL/TLS by WSS (WebSocketSecure). hyper-tunnel works on the following route.

```
web browser <--HTTPS--> hyper-tunnel server
                              |
~~~~~~~~~~~~~~Firewall~~~~~~ WSS ~~~~~~~
                              |
  localhost <-HTTP(S)-> hyper-tunnel client
```

## How to use

```sh
$ npm install -g asciian/hyper-tunnel
$ htunnel-server --authorization USERNAME:PASSWORD --port 4000
$ htunnel-client --authorization USERNAME:PASSWORD --localhost localhost:8000 --remotehost localhost:4000
```

## Related Services

- localtunnel
- ngrok
- pagekite

## Copyright & License

Copryright (c) 2018 TANIGUCHI Masaya All Rights Reserved.

hyper-tunnel licensed under the GPLv3 or later.