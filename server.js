import Fastify from 'fastify'
import { env } from '@xenova/transformers';
import { BertForMaskedLM, BertTokenizer, Tensor } from '@xenova/transformers';

import tokenizer_json from './my_fast_onnx_bert/tokenizer.json' assert { type: "json" };
import tokenizer_config from './my_fast_onnx_bert/tokenizer_config.json' assert { type: "json" };

env.remoteModels = false;
env.localModelPath = '/app/';

const tokenizer = await new BertTokenizer(tokenizer_json, tokenizer_config);
const model = await BertForMaskedLM.from_pretrained('./my_fast_onnx_bert');

const fastify = Fastify({
  logger: true
});

fastify.get('/', async function handler (request, _reply) {
  console.log("request.query.input", request.query.input);
  const input = request.query.input;
  console.log("input",input);
  const inputs = await tokenizer(input);
  console.log("inputs", inputs);

  const input_ids = inputs.input_ids[0].tolist();
  const attention_mask = inputs.attention_mask[0].tolist();
  const token_type_ids = inputs.token_type_ids[0].tolist();

  // convert ? (344) to tokenizer.mask_token_id (4)
  input_ids[input_ids.indexOf(BigInt(344))] = BigInt(tokenizer.mask_token_id);
  console.log("input_ids",input_ids);

  const toTensor = ids => new Tensor("int64", ids, [1, ids.length]);
  console.log("after input_ids", toTensor(input_ids));
  console.log("attention_mask", toTensor(attention_mask));
  console.log("token_type_ids", toTensor(token_type_ids));

  const { logits } = await model({
      input_ids: toTensor(input_ids),
      attention_mask: toTensor(attention_mask),
      token_type_ids: toTensor(token_type_ids),
  });

  console.log("tokenizer.mask_token_id", tokenizer.mask_token_id);
  const mask_token_index = input_ids.indexOf(BigInt(tokenizer.mask_token_id));
  console.log("mask_token_index", mask_token_index);

  const predicteds = logits[0][mask_token_index].tolist();
  console.log("predicteds", predicteds.slice(0,10));

  // max_id
  console.log("Math.max(predicteds)", Math.max(...predicteds));
  const predicted_token_id = predicteds.indexOf(Math.max(...predicteds));
  console.log("predicted_token_id", predicted_token_id);
  const answer = tokenizer.decode([predicted_token_id]);

  // // ranking ids
  // const sorted_predicteds = logits[0][mask_token_index].tolist();
  // sorted_predicteds.sort((a, b) => b - a);
  // const top_token_logits = sorted_predicteds.slice(0,20);
  // console.log("top_token_logits", top_token_logits);
  // const predicted_token_ids = [];
  // top_token_logits.forEach(logit => {
  //   predicted_token_ids.push(predicteds.indexOf(logit));
  // });
  // console.log("predicted_token_ids", predicted_token_ids);
  // const answer = tokenizer.decode(predicted_token_ids);

  return { input: input, answer: answer };
});

try {
  await fastify.listen({ port: 3000, host: "0.0.0.0" });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
