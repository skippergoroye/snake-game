"use client"
import SnakeGame from "@/components/snakegame";
import { Provider } from "react-redux";
import { store } from "@/components/snakegame";


export default function Home() {
  return (
    <Provider store={store}>
       <main>
      <SnakeGame />
    </main>

    </Provider>
   
   
  );
}
