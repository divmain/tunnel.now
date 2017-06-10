# tunnel.now

Zeit's [now](https://zeit.co/now) platform is fantastic for rapid iteration on Node.js projects.  However, sometimes - when debugging a webhook, for example - you might want to run the project on your development machine.

You _could_ make changes, deploy, and update aliases as you go.  However, this project provides an alternative: it tunnels HTTP requests that are sent to a Zeit domain to your local dev machine.

## Quick start

**Step 1: Install**

```
> npm install -g tunnel.now
/Users/dbustad/.nodenv/versions/8.0.0/bin/tunnel.now -> /Users/dbustad/.nodenv/versions/8.0.0/lib/node_modules/tunnel.now/src/tunnel.js
added 79 packages in 4.609s
```

**Step 2: Update npm links (optional)**

This step is only necessary for users of [nodenv](https://github.com/nodenv/nodenv)

```
> nodenv rehash
```

**Step 3: Deploy your tunnel endpoint**

```
> tunnel.deploy
```

You can also alias directly at this step, like so:

```
> tunnel.deploy my-alias.now.sh
```

Note that this deployment can be re-used however many times you'd like.

**Step 3: Start your application server**

In your project directly, do what you need to do to start your server, and note the port that is opened:

```
> npm run start
Listening on port 8080...
```

**Step 4: In a separate terminal, start your tunnel**

`tunnel.now` takes two arguments:

1. The `now` hostname.  This will be either the hostname that `now` provided to you, or the alias that you specified during step 3.
2. The port of your application, running locally.

```
> tunnel.now my-alias.now.sh 8080
Connected to wss://my-alias.now.sh:443.
Tunneling requests to http://localhost:8080...
```

**Step 5: Open your browser!**

Any HTTP requests made to the `now` hostname or alias will be tunneled to your local machine.

## FAQ

**Does this work with other services?**  Yes.  The only hard requirement is that the host provides HTTP and WebSocket support.  However, you will need to deploy the `tunnel.now` repo yourself.

## License

This project is covered under the MIT License.  Please see the [LICENSE](./LICENSE) file for more information.
