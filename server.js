// Backend: Node.js (server.js)
const express = require("express");
const cors = require("cors");
const { WebSocketServer } = require("ws");

const app = express();
app.use(cors());

const server = app.listen(5000, () => console.log("Server running on port 5000"));
const wss = new WebSocketServer({ server });

wss.on("connection", (wsClient) => {
    console.log("Client connected");

    const derivWS = new WebSocket("wss://ws.deriv.com/websockets/v3");

    derivWS.onopen = () => {
        derivWS.send(JSON.stringify({ ticks: "R_100", subscribe: 1 }));
    };

    derivWS.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.tick) {
                wsClient.send(JSON.stringify({ price: data.tick.quote, time: data.tick.epoch }));
            }
        } catch (error) {
            console.error("Error parsing Deriv WebSocket message:", error);
        }
    };

    derivWS.onerror = (error) => console.error("Deriv WebSocket error:", error);
    wsClient.on("close", () => derivWS.close());
});

// Frontend: React (App.js)
import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const App = () => {
    const [prices, setPrices] = useState([]);

    useEffect(() => {
        const ws = new WebSocket("ws://localhost:5000");

        ws.onmessage = (event) => {
            try {
                const { price, time } = JSON.parse(event.data);
                setPrices((prev) => [...prev.slice(-50), { time, price }]); // Keep last 50 prices
            } catch (error) {
                console.error("Error parsing WebSocket message:", error);
            }
        };

        ws.onerror = (error) => console.error("WebSocket error:", error);
        ws.onclose = () => console.warn("WebSocket connection closed");

        return () => ws.close();
    }, []);

    return (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
            <h2>Volatility 100 Index - Live Monitoring</h2>
            <LineChart width={600} height={300} data={prices}>
                <XAxis dataKey="time" tickFormatter={(t) => new Date(t * 1000).toLocaleTimeString()} />
                <YAxis domain={["auto", "auto"]} />
                <Tooltip />
                <CartesianGrid strokeDasharray="3 3" />
                <Line type="monotone" dataKey="price" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
        </div>
    );
};

export default App;
