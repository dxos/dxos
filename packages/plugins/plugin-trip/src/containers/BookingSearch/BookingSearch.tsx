//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { Obj, Ref } from '@dxos/echo';
import { getSpace } from '@dxos/react-client/echo';
import { Button, Icon, Input, Select, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { Booking, BookingOperation, BookingSearch as BS, Segment, TripCapabilities } from '#types';

import { offerToBookingProps, offerToFlightDetails } from './offer-to-segment';

export type BookingSearchProps = {
  segment: Segment.Segment;
};

type QueryState = {
  origin: string;
  destination: string;
  departureDate: string;
  cabinClass: Segment.ServiceClass;
  passengers: number;
};

const CABIN_OPTIONS: Segment.ServiceClass[] = ['economy', 'premium', 'business', 'first'];

export const BookingSearch = ({ segment }: BookingSearchProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const kind = Segment.getKind(segment);

  // Resolve contributed services for the provider picker + empty state. The actual search runs
  // through the SearchBookings operation so the assistant shares the same path.
  const allServices = useCapabilities(TripCapabilities.BookingService);
  const services = useMemo(() => allServices.filter((service) => service.kinds.includes(kind)), [allServices, kind]);
  const [serviceId, setServiceId] = useState<string | undefined>(undefined);
  const service = useMemo(
    () => services.find((candidate) => candidate.id === serviceId) ?? services.at(0),
    [services, serviceId],
  );

  const origin = Segment.getOrigin(segment);
  const destination = Segment.getDestination(segment);
  const [query, setQuery] = useState<QueryState>({
    origin: origin?.code ?? '',
    destination: destination?.code ?? '',
    departureDate: Segment.getDepartAt(segment) ?? '',
    cabinClass: 'economy',
    passengers: 1,
  });

  const [offers, setOffers] = useState<readonly BS.Offer[] | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  // Duffel rejects an offer request without a complete slice; require the core fields client-side
  // so the user gets actionable feedback rather than a server error.
  const canSearch = Boolean(service && query.origin && query.destination && query.departureDate);

  const handleSearch = useCallback(async () => {
    if (!service) {
      return;
    }
    setPending(true);
    setError(undefined);
    setOffers(undefined);
    try {
      const { data, error: invocationError } = await invokePromise(BookingOperation.SearchBookings, {
        query: {
          _tag: 'flight',
          origin: query.origin || undefined,
          destination: query.destination || undefined,
          departureDate: query.departureDate || undefined,
          cabinClass: query.cabinClass,
          passengers: query.passengers,
        },
        provider: service.id,
      });
      if (invocationError) {
        const missingKey = invocationError.name === 'MissingApiKeyError';
        setError(missingKey ? t('booking.missing-key.message') : t('booking.error.message'));
        return;
      }
      setOffers(data?.offers);
    } catch (err) {
      const missingKey = err instanceof Error && err.name === 'MissingApiKeyError';
      setError(missingKey ? t('booking.missing-key.message') : t('booking.error.message'));
    } finally {
      setPending(false);
    }
  }, [service, query, invokePromise, t]);

  const handleSelectOffer = useCallback(
    (offer: BS.Offer) => {
      if (offer._tag !== 'flight') {
        return;
      }
      const space = getSpace(segment);
      if (!space) {
        return;
      }
      const booking = space.db.add(Booking.make(offerToBookingProps(offer)));
      const details = offerToFlightDetails(offer);
      Obj.update(segment, (segment) => {
        // Mutate the (flight) details in place: a whole-object assignment would require the
        // readonly schema-Type shape to match the live object's mutable instance-Type.
        if (segment.details._tag !== 'flight') {
          return;
        }
        segment.details.provider = details.provider;
        segment.details.number = details.number;
        segment.details.origin = details.origin && { code: details.origin.code, name: details.origin.name };
        segment.details.destination = details.destination && {
          code: details.destination.code,
          name: details.destination.name,
        };
        segment.details.departAt = details.departAt;
        segment.details.arriveAt = details.arriveAt;
        segment.details.serviceClass = details.serviceClass;
        segment.booking = Ref.make(booking);
      });
    },
    [segment],
  );

  if (services.length === 0) {
    return <div className='p-4 text-description'>{t('booking.no-providers.message')}</div>;
  }

  return (
    <div className='flex flex-col gap-3 p-3 overflow-y-auto'>
      {services.length > 1 && (
        <Select.Root value={service?.id} onValueChange={setServiceId}>
          <Select.TriggerButton placeholder={t('booking.provider.placeholder')} />
          <Select.Portal>
            <Select.Content>
              <Select.Viewport>
                {services.map((candidate) => (
                  <Select.Option key={candidate.id} value={candidate.id}>
                    {candidate.label}
                  </Select.Option>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      )}

      <div className='grid grid-cols-2 gap-2'>
        <Input.Root>
          <Input.Label>{t('booking.origin.label')}</Input.Label>
          <Input.TextInput
            placeholder='JFK'
            value={query.origin}
            onChange={(event) => setQuery((state) => ({ ...state, origin: event.target.value.toUpperCase() }))}
          />
        </Input.Root>
        <Input.Root>
          <Input.Label>{t('booking.destination.label')}</Input.Label>
          <Input.TextInput
            placeholder='LHR'
            value={query.destination}
            onChange={(event) => setQuery((state) => ({ ...state, destination: event.target.value.toUpperCase() }))}
          />
        </Input.Root>
        <Input.Root>
          <Input.Label>{t('booking.departure.label')}</Input.Label>
          <Input.TextInput
            type='date'
            value={query.departureDate.slice(0, 10)}
            onChange={(event) =>
              setQuery((state) => ({
                ...state,
                departureDate: event.target.value ? new Date(event.target.value).toISOString() : '',
              }))
            }
          />
        </Input.Root>
        <Input.Root>
          <Input.Label>{t('booking.passengers.label')}</Input.Label>
          <Input.TextInput
            type='number'
            value={String(query.passengers)}
            onChange={(event) =>
              setQuery((state) => ({ ...state, passengers: Math.max(1, Number(event.target.value) || 1) }))
            }
          />
        </Input.Root>
      </div>

      <Select.Root
        value={query.cabinClass}
        onValueChange={(value) => setQuery((state) => ({ ...state, cabinClass: value as Segment.ServiceClass }))}
      >
        <Select.TriggerButton placeholder={t('booking.cabin.placeholder')} />
        <Select.Portal>
          <Select.Content>
            <Select.Viewport>
              {CABIN_OPTIONS.map((value) => (
                <Select.Option key={value} value={value}>
                  {value}
                </Select.Option>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>

      <Button variant='primary' disabled={pending || !canSearch} onClick={() => void handleSearch()}>
        {pending ? t('booking.searching.label') : t('booking.search.label')}
      </Button>

      {error && <div className='text-error'>{error}</div>}
      {offers && offers.length === 0 && <div className='text-description'>{t('booking.no-offers.message')}</div>}

      <div className='flex flex-col gap-2'>
        {offers?.map((offer) =>
          offer._tag === 'flight' ? (
            <button
              key={offer.id}
              className='flex items-center justify-between rounded border border-separator p-2 text-start hover:bg-hoverSurface'
              onClick={() => handleSelectOffer(offer)}
            >
              <span className='flex items-center gap-2'>
                <Icon icon='ph--airplane--regular' size={4} />
                <span>{offer.carrier.name}</span>
                <span className='text-description'>
                  {offer.slices.at(0)?.origin.code} → {offer.slices.at(-1)?.destination.code}
                </span>
              </span>
              <span className='font-mono'>
                {offer.totalAmount} {offer.currency}
              </span>
            </button>
          ) : null,
        )}
      </div>
    </div>
  );
};
