import { IInOutFunction, IInOutChangeNotify } from '../yahka.homekit-bridge';
import { ISubscriptionRequest, ISubscriptionRequestor } from '../yahka.ioBroker-adapter';
export { IInOutChangeNotify, IInOutFunction } from '../yahka.homekit-bridge';
class TIoBrokerInOutFunctionBase {

}
export abstract class TIoBrokerInOutFunction_StateBase extends TIoBrokerInOutFunctionBase implements ISubscriptionRequestor, IInOutFunction {
    protected debounceTimer = -1;
    public subscriptionRequests: ISubscriptionRequest[] = [];

    constructor(protected adapter: ioBroker.IAdapter, protected stateName: string, protected deferredTime: number = 0) {
        super();
        this.addSubscriptionRequest(stateName);
    }

    addSubscriptionRequest(stateName: string) {
        let subscriptionEvent = this.subscriptionEvent.bind(this, stateName);
        this.subscriptionRequests.push({
            subscriptionType: 'state',
            subscriptionIdentifier: stateName,
            subscriptionEvent: subscriptionEvent
        });
    }

    getValueOnRead(ioState: ioBroker.IState): any {
        if (ioState)
            return ioState.val;
        else
            return null;
    }

    getValueOnNotify(ioState: ioBroker.IState): any {
        if (ioState)
            return ioState.val;
        else
            return null;
    }

    toIOBroker(plainIoValue, callback) {
        this.adapter.log.debug('writing state to ioBroker [' + this.stateName + ']: ' + JSON.stringify(plainIoValue));
        this.adapter.getForeignState(this.stateName, (error, ioState) => {
            let value = this.getValueOnRead(ioState);
            let valueChanged = value !== plainIoValue;
            this.adapter.log.debug('checking value change: ' + JSON.stringify(value) + ' != ' + JSON.stringify(plainIoValue) + ' = ' + valueChanged);
            if (valueChanged) {
                this.adapter.setForeignState(this.stateName, plainIoValue, false, (error) => {
                    if (error)
                        this.adapter.log.error('setForeignState error [' + this.stateName + '] to [' + JSON.stringify(plainIoValue) + ']: ' + error);
                    callback();
                });
            } else {
                callback();
            }
        });
    }

    fromIOBroker(callback) {
        this.adapter.log.debug('reading state from ioBroker [' + this.stateName + ']');
        this.adapter.getForeignState(this.stateName, (error, ioState) => {
            this.adapter.log.debug('read state from ioBroker [' + this.stateName + ']: ' + JSON.stringify(ioState));
            if (error)
                this.adapter.log.error('... with error: ' + error);

            let value = this.getValueOnRead(ioState);
            callback(error, value);
        });
    }

    subscriptionEvent(stateName: string, ioState: ioBroker.IState, callback: IInOutChangeNotify) {
        this.adapter.log.debug('change event from ioBroker via [' + this.stateName + ']' + JSON.stringify(ioState));
        let newValue = this.getValueOnNotify(ioState);
        if (newValue !== undefined)
            this.executeCallback(callback, newValue);
        else
            this.adapter.log.debug('state was filtered - notification is canceled');
    }

    executeCallback(callback: IInOutChangeNotify, plainIOValue: any) {
        if (this.deferredTime > 0)
            this.setupDeferredChangeEvent(callback, plainIOValue);
        else
            callback(plainIOValue);
    }

    setupDeferredChangeEvent(callback: IInOutChangeNotify, plainIOValue: any) {
        this.cancelDeferredChangeEvent();
        this.debounceTimer = setTimeout(this.deferredChangeEvent.bind(this, callback, plainIOValue), 150);
    }

    cancelDeferredChangeEvent() {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = -1;
    }

    deferredChangeEvent(callback: IInOutChangeNotify, plainIOValue: any) {
        this.adapter.log.debug('[' + this.stateName + '] firing deferred change event:' + JSON.stringify(plainIOValue));
        callback(plainIOValue);
    }

}