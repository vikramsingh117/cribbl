const path = require('path');
const MTProto = require('@mtproto/core');
const { sleep } = require('@mtproto/core/src/utils/common');
 
require('dotenv').config()
class API {
  constructor() {
    this.mtproto = new MTProto({
      api_id: process.env.API_ID,
      api_hash:process.env.API_HASH,

      storageOptions: {
        path: path.resolve(__dirname, './data/1.json'),
      },
    });
  }

  async call(method, params, options = {}) {
    try {
      console.log("personal log, mtproto call method:", method);
      const result = await this.mtproto.call(method, params, options);
      console.log(result);

      if (result && result.phone_code_hash) {
        console.log("Phone code hash:", result.phone_code_hash);
      } else {
        console.error("Failed to get phone code hash or unexpected result:", result);
      }

      return result;
    } catch (error) {
      console.log(`${method} error:`, error);

      const { error_code, error_message } = error;

      if (error_code === 420) {
        const seconds = Number(error_message.split('FLOOD_WAIT_')[1]);
        const ms = seconds * 1000;

        await sleep(ms);

        return this.call(method, params, options);
      }

      if (error_code === 303) {
        const [type, dcIdAsString] = error_message.split('_MIGRATE_');

        const dcId = Number(dcIdAsString);

        // If auth.sendCode call on incorrect DC need change default DC, because
        // call auth.signIn on incorrect DC return PHONE_CODE_EXPIRED error
        if (type === 'PHONE') {
          await this.mtproto.setDefaultDc(dcId);
        } else {
          Object.assign(options, { dcId });
        }

        return this.call(method, params, options);
      }

      return Promise.reject(error);
    }
  }
}

const api = new API();

module.exports = api;