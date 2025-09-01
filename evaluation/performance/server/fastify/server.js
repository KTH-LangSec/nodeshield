// Require the framework and instantiate it

// ESM
import Fastify from "fastify";

const fastify = Fastify({
	logger: true,
});

// Declare a route
fastify.get("/", (request, reply) => {
	reply.send({ hello: "world" });
});

// Run the server!
fastify.listen(
	{
		/// NOTE: This config deviates from the example in the documentation. We
		/// change this to enable configuring the host and port in a transparent
		/// way, primarily for use in the container.
		host: process.env.HOST,
		port: process.env.PORT,
	},
	(err, address) => {
		if (err) throw err;
		// Server is now listening on ${address}
	},
);
