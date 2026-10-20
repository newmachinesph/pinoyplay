import test from 'node:test';
import assert from 'node:assert/strict';
import { PinoyPlaySDK, games, boardId } from '../src/sdk';
import { catalog } from '../src/catalog';
import { difficulties } from '../src/core/difficulty';
test('the collection exposes ten games, five of each dimension, and thirty independent score queues', () => {
  assert.equal(catalog.length,10);assert.equal(catalog.filter(g=>g.dimension==='2D').length,5);
  const data=new Map<string,string>();let id=0;
  const store={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v)}};
  const sdk=new PinoyPlaySDK(store,()=>String(++id));
  for(const game of games)for(const mode of difficulties){sdk.submitScore(game,100,mode);sdk.submitScore(game,50,mode);}
  assert.equal(sdk.pendingCount,30);
  assert.equal(new Set(games.flatMap(g=>difficulties.map(d=>boardId(g,d)))).size,30);
  const reload=new PinoyPlaySDK(store,()=>String(++id));assert.equal(reload.pendingCount,30);
  for(const game of games)for(const mode of difficulties)assert.equal(reload.best(game,mode),100);
});
